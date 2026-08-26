import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import {
  PayerInput,
  PayerEmpanelmentInput,
  UpdatePayerEmpanelmentStatusInput,
  PatientInsurancePolicyInput,
  PayerTariffInput,
  SubmitClaimInput,
  UpdateClaimStatusInput,
} from './dto/insurance.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, orgScopeVia, orgIdForWrite, isSameOrg } from '../common/scoping/tenant-scope';
import { resolveServicePrice } from '../common/pricing/resolve-price';

// REQ131 — the only legal forward transitions; submitted/under_review are
// the working states, rejected/settled are terminal (no map entry = no
// legal transition out).
const CLAIM_TRANSITIONS: Record<string, string[]> = {
  submitted: ['under_review'],
  under_review: ['approved', 'rejected'],
  approved: ['settled'],
  rejected: [],
  settled: [],
};

// REQ031 (US-INS-01/03, P1 scope) — payer/tariff master + patient policy
// capture only. No claim/pre-auth state machine (that's the requirement
// doc's own explicit P2 follow-on, "OPD first" per the PRD's Open
// Question 10). Payers is global reference data (like Languages) since
// insurers/TPAs are shared across every tenant, not owned by one.
@Injectable()
export class InsuranceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientsService: PatientsService,
  ) {}

  async findPayers(isActive: boolean | undefined) {
    return this.prisma.payers.findMany({
      where: isActive !== undefined ? { is_active: isActive } : {},
      orderBy: { name: 'asc' },
    });
  }

  async createPayer(input: PayerInput) {
    return this.prisma.payers.create({ data: { name: input.name, payer_type: input.payer_type } });
  }

  private async assertClinicInScope(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) throw new BadRequestException('Clinic not found');
    if (!isSameOrg(user, clinic.client_org_id)) throw new BadRequestException('Clinic not found');
    return clinic;
  }

  async findEmpanelments(clinicId: string | undefined, user: JwtPayload) {
    return this.prisma.payerEmpanelments.findMany({
      where: { ...(clinicId ? { clinic_id: clinicId } : {}), ...orgScope(user) },
      include: { payer: true, clinic: true },
      orderBy: { start_date: 'desc' },
    });
  }

  async createEmpanelment(input: PayerEmpanelmentInput, user: JwtPayload) {
    const payer = await this.prisma.payers.findUnique({ where: { id: input.payer_id } });
    if (!payer) throw new BadRequestException('Payer not found');
    const clinic = await this.assertClinicInScope(input.clinic_id, user);
    return this.prisma.payerEmpanelments.create({
      data: {
        payer_id: input.payer_id,
        clinic_id: input.clinic_id,
        client_org_id: clinic.client_org_id as string,
        start_date: new Date(input.start_date),
        end_date: input.end_date ? new Date(input.end_date) : undefined,
        renewal_reminder_date: input.renewal_reminder_date ? new Date(input.renewal_reminder_date) : undefined,
      },
      include: { payer: true, clinic: true },
    });
  }

  async updateEmpanelmentStatus(id: string, input: UpdatePayerEmpanelmentStatusInput, user: JwtPayload) {
    const existing = await this.prisma.payerEmpanelments.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Empanelment not found');
    if (!isSameOrg(user, existing.client_org_id)) throw new NotFoundException('Empanelment not found');
    return this.prisma.payerEmpanelments.update({
      where: { id },
      data: { status: input.status },
      include: { payer: true, clinic: true },
    });
  }

  // Hard Rule 6 / REQ018 pattern — a 'patient'-role caller may only act on
  // their own record or a genuine dependant's.
  private async assertPatientAccessible(patientId: string, user: JwtPayload) {
    if (user.roles.includes('patient')) {
      const allowedIds = await this.patientsService.ownAndDependantPatientIds(user);
      if (!allowedIds.includes(patientId)) throw new BadRequestException('Patient not found');
    }
  }

  async findPolicies(patientId: string, user: JwtPayload) {
    await this.assertPatientAccessible(patientId, user);
    return this.prisma.patientInsurancePolicies.findMany({
      where: { patient_id: patientId, ...orgScope(user) },
      include: { payer: true },
      orderBy: { valid_from: 'desc' },
    });
  }

  async createPolicy(input: PatientInsurancePolicyInput, user: JwtPayload) {
    await this.assertPatientAccessible(input.patient_id, user);
    const payer = await this.prisma.payers.findUnique({ where: { id: input.payer_id } });
    if (!payer) throw new BadRequestException('Payer not found');
    const orgId = orgIdForWrite(user, 'PatientInsurancePolicy');
    if (!orgId) throw new BadRequestException('Cannot record a policy without an organization');
    return this.prisma.patientInsurancePolicies.create({
      data: {
        patient_id: input.patient_id,
        client_org_id: orgId,
        payer_id: input.payer_id,
        policy_number: input.policy_number,
        policy_holder_name: input.policy_holder_name,
        valid_from: new Date(input.valid_from),
        valid_until: input.valid_until ? new Date(input.valid_until) : undefined,
      },
      include: { payer: true },
    });
  }

  private tariffToGraphQL(row: any) {
    return {
      id: row.id,
      payer: row.payer,
      product_id: row.product_id,
      product_name: row.product?.name,
      tariff_price: row.tariff_price / 100,
      updated_at: row.updated_at,
    };
  }

  // REQ031 (US-INS-02) — master data only, see PayerTariffs' own schema
  // comment for why billing itself is not wired to this yet.
  async findTariffs(payerId: string | undefined, productId: string | undefined, user: JwtPayload) {
    const rows = await this.prisma.payerTariffs.findMany({
      where: { ...(payerId ? { payer_id: payerId } : {}), ...(productId ? { product_id: productId } : {}), ...orgScope(user) },
      include: { payer: true, product: true },
      orderBy: { updated_at: 'desc' },
    });
    return rows.map((r) => this.tariffToGraphQL(r));
  }

  async setPayerTariff(input: PayerTariffInput, user: JwtPayload) {
    const payer = await this.prisma.payers.findUnique({ where: { id: input.payer_id } });
    if (!payer) throw new BadRequestException('Payer not found');
    const product = await this.prisma.products.findUnique({ where: { id: input.product_id } });
    if (!product || product.is_deleted) throw new BadRequestException('Service or product not found');
    if (!isSameOrg(user, product.client_org_id)) throw new BadRequestException('Service or product not found');
    const orgId = product.client_org_id ?? orgIdForWrite(user, 'PayerTariff');
    if (!orgId) throw new BadRequestException('Cannot record a tariff without an organization');
    const tariffPricePaise = Math.round(input.tariff_price * 100);
    const row = await this.prisma.payerTariffs.upsert({
      where: { payer_id_product_id: { payer_id: input.payer_id, product_id: input.product_id } },
      create: { payer_id: input.payer_id, product_id: input.product_id, client_org_id: orgId, tariff_price: tariffPricePaise },
      update: { tariff_price: tariffPricePaise },
      include: { payer: true, product: true },
    });
    return this.tariffToGraphQL(row);
  }

  // REQ100 — a read-only "what would this cost billed to payer X" estimate.
  // Deliberately NOT wired into createRazorpayOrder/recordCounterPayment
  // (see REQ100's own doc: neither call site has a real "billing this to
  // an insurer" signal today — that's REQ031's own deferred P2 claims
  // state machine). This is a front-desk/admin quoting tool only.
  async estimatedPayerCharge(productId: string, payerId: string, patientId: string | undefined, user: JwtPayload) {
    const product = await this.prisma.products.findUnique({ where: { id: productId } });
    if (!product || product.is_deleted) throw new BadRequestException('Service or product not found');
    if (!isSameOrg(user, product.client_org_id)) throw new BadRequestException('Service or product not found');
    const payer = await this.prisma.payers.findUnique({ where: { id: payerId } });
    if (!payer) throw new BadRequestException('Payer not found');
    let patient = null;
    if (patientId) {
      await this.assertPatientAccessible(patientId, user);
      patient = await this.prisma.patients.findUnique({ where: { id: patientId } });
    }
    const tariff = await this.prisma.payerTariffs.findUnique({
      where: { payer_id_product_id: { payer_id: payerId, product_id: productId } },
    });
    const amountPaise = resolveServicePrice(product, patient, undefined, null, tariff?.tariff_price ?? undefined);
    return { amount: amountPaise != null ? amountPaise / 100 : null, has_tariff: !!tariff };
  }

  private claimsOrgScope(user: JwtPayload) {
    // 2-level nesting (Claims has no client_org_id/clinic_id of its own),
    // same idiom pharmacy.service.ts's pendingDispenseItems() established:
    // orgScopeVia(user, 'clinic') already returns {clinic: {client_org_id}},
    // wrapped one level deeper under 'appointment'.
    return { appointment: orgScopeVia(user, 'clinic') };
  }

  private toClaimGraphQL(row: any) {
    return {
      ...row,
      patient_name: row.patient ? `${row.patient.first_name} ${row.patient.last_name}` : 'Unknown',
      appointment_date: row.appointment?.appointment_date,
      claim_amount: row.claim_amount / 100,
      approved_amount: row.approved_amount != null ? row.approved_amount / 100 : undefined,
    };
  }

  // REQ131 (REQ031's own P2 follow-on). patient_id is derived from the
  // already-org-validated appointment, never taken from the input (Hard
  // Rule 6) -- a caller cannot submit a claim against an arbitrary patient.
  async submitClaim(input: SubmitClaimInput, user: JwtPayload) {
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: input.appointment_id },
      include: { clinic: true },
    });
    if (!appointment || appointment.is_deleted) throw new BadRequestException('Appointment not found');
    if (!isSameOrg(user, appointment.clinic.client_org_id)) throw new BadRequestException('Appointment not found');

    const payer = await this.prisma.payers.findUnique({ where: { id: input.payer_id } });
    if (!payer) throw new BadRequestException('Payer not found');

    if (input.policy_id) {
      const policy = await this.prisma.patientInsurancePolicies.findUnique({ where: { id: input.policy_id } });
      if (!policy || policy.patient_id !== appointment.patient_id) {
        throw new BadRequestException('Policy not found for this patient');
      }
    }

    const row = await this.prisma.claims.create({
      data: {
        appointment_id: input.appointment_id,
        patient_id: appointment.patient_id,
        payer_id: input.payer_id,
        policy_id: input.policy_id,
        claim_amount: Math.round(input.claim_amount * 100),
        notes: input.notes,
        submitted_by_user_id: user.sub,
      },
      include: { payer: true, patient: true, appointment: true },
    });
    return this.toClaimGraphQL(row);
  }

  async claims(status: string | undefined, user: JwtPayload) {
    const rows = await this.prisma.claims.findMany({
      where: { ...(status ? { status } : {}), ...this.claimsOrgScope(user) },
      include: { payer: true, patient: true, appointment: true },
      orderBy: { submitted_at: 'desc' },
    });
    return rows.map((r) => this.toClaimGraphQL(r));
  }

  private async loadClaimForUser(id: string, user: JwtPayload) {
    const claim = await this.prisma.claims.findUnique({
      where: { id },
      include: { payer: true, patient: true, appointment: { include: { clinic: true } } },
    });
    if (!claim) throw new NotFoundException('Claim not found');
    if (!isSameOrg(user, claim.appointment.clinic.client_org_id)) throw new NotFoundException('Claim not found');
    return claim;
  }

  async claim(id: string, user: JwtPayload) {
    const claim = await this.loadClaimForUser(id, user);
    return this.toClaimGraphQL(claim);
  }

  // REQ131 — enforces the state machine (CLAIM_TRANSITIONS): a caller
  // cannot skip states or move a terminal claim (rejected/settled)
  // anywhere. approved_amount is required to move into 'approved',
  // rejection_reason is required to move into 'rejected' -- both real
  // decision artifacts, not optional metadata.
  async updateClaimStatus(id: string, input: UpdateClaimStatusInput, user: JwtPayload) {
    const claim = await this.loadClaimForUser(id, user);
    const legalNext = CLAIM_TRANSITIONS[claim.status] ?? [];
    if (!legalNext.includes(input.status)) {
      throw new BadRequestException(`Cannot move a claim from '${claim.status}' to '${input.status}'`);
    }
    if (input.status === 'approved' && input.approved_amount == null) {
      throw new BadRequestException('approved_amount is required when approving a claim');
    }
    if (input.status === 'rejected' && !input.rejection_reason) {
      throw new BadRequestException('rejection_reason is required when rejecting a claim');
    }
    const row = await this.prisma.claims.update({
      where: { id },
      data: {
        status: input.status,
        approved_amount: input.status === 'approved' ? Math.round(input.approved_amount! * 100) : claim.approved_amount,
        rejection_reason: input.status === 'rejected' ? input.rejection_reason : claim.rejection_reason,
        decided_at: ['approved', 'rejected'].includes(input.status) ? new Date() : claim.decided_at,
        settled_at: input.status === 'settled' ? new Date() : claim.settled_at,
      },
      include: { payer: true, patient: true, appointment: true },
    });
    return this.toClaimGraphQL(row);
  }
}
