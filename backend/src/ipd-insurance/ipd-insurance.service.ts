import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { assertSameOrg, isSameOrg, orgScope } from '../common/scoping/tenant-scope';
import { nextDocumentNumber, DOCUMENT_SERIES } from '../common/billing/document-numbering';
import { IpdBillingService } from '../ipd-billing/ipd-billing.service';
import {
  CreatePreAuthorizationInput,
  UpdatePreAuthorizationStatusInput,
  BindPreAuthorizationToAdmissionInput,
  RequestPreAuthEnhancementInput,
  DecidePreAuthEnhancementInput,
  CreateIpdClaimInput,
  UpdateIpdClaimStatusInput,
  SettleIpdClaimInput,
  AddIpdClaimDeductionInput,
  CreateIpdInsuranceDocumentInput,
} from './dto/ipd-insurance.input';

const RUPEES_TO_PAISE = (rupees: number) => Math.round(rupees * 100);
const PAISE_TO_RUPEES = (paise: number) => paise / 100;

// REQ179 (IPD slice 5) -- the only legal forward transitions. No entry for
// a status = no legal transition out (terminal), matching insurance
// .service.ts's own CLAIM_TRANSITIONS precedent exactly.
const PRE_AUTH_TRANSITIONS: Record<string, string[]> = {
  requested: ['approved', 'rejected', 'cancelled'],
  approved: ['expired', 'cancelled'],
  rejected: [],
  expired: [],
  cancelled: [],
};
const ENHANCEMENT_TRANSITIONS: Record<string, string[]> = {
  requested: ['approved', 'rejected'],
  approved: [],
  rejected: [],
};
const CLAIM_TRANSITIONS: Record<string, string[]> = {
  draft: ['submitted'],
  submitted: ['under_review'],
  under_review: ['approved', 'partially_approved', 'rejected'],
  approved: [], // -> settled only via settleIpdClaim, a real payment posting, not a bare status flip
  partially_approved: [],
  rejected: [],
  settled: [],
};

// REQ179 (IPD slice 5) -- TPA cashless: pre-authorization, mid-stay
// enhancement, claim reconciliation with line-level disallowance. See the
// schema.prisma file-header comment on this domain for why Claims (REQ131)
// cannot be reused. Every write here is additive to slices 1-4 -- nothing
// in wards/admissions/nursing/operation-theatre/ipd-billing changes.
@Injectable()
export class IpdInsuranceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: IpdBillingService,
  ) {}

  // ── Scope guards (small, per-service -- REQ181's own established convention) ──
  private async assertClinicInScope(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) throw new BadRequestException('Clinic not found');
    if (!isSameOrg(user, clinic.client_org_id)) throw new BadRequestException('Clinic not found');
    return clinic;
  }

  private async assertPatientInScope(patientId: string, user: JwtPayload) {
    const patient = await this.prisma.patients.findUnique({ where: { id: patientId } });
    if (!patient || patient.is_deleted) throw new BadRequestException('Patient not found');
    if (!isSameOrg(user, patient.client_org_id)) throw new BadRequestException('Patient not found');
    return patient;
  }

  private async assertPayerExists(payerId: string) {
    const payer = await this.prisma.payers.findUnique({ where: { id: payerId } });
    if (!payer || !payer.is_active) throw new BadRequestException('Payer not found');
    return payer;
  }

  private async assertPolicyBelongsToPatient(policyId: string, patientId: string) {
    const policy = await this.prisma.patientInsurancePolicies.findUnique({ where: { id: policyId } });
    if (!policy || policy.patient_id !== patientId) throw new BadRequestException('Policy not found for this patient');
    return policy;
  }

  private async assertAdmissionInScope(admissionId: string, user: JwtPayload) {
    const admission = await this.prisma.admissions.findUnique({
      where: { id: admissionId },
      include: { patient: true, clinic: true },
    });
    if (!admission || admission.is_deleted) throw new NotFoundException('Admission not found');
    assertSameOrg(user, admission.client_org_id, 'Admission');
    return admission;
  }

  private fullName(row: any): string | undefined {
    if (!row) return undefined;
    return [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || undefined;
  }

  // ── Pre-authorizations ───────────────────────────────────────────────

  async createPreAuthorization(input: CreatePreAuthorizationInput, user: JwtPayload) {
    const clinic = await this.assertClinicInScope(input.clinic_id, user);
    const patient = await this.assertPatientInScope(input.patient_id, user);
    await this.assertPayerExists(input.payer_id);
    if (input.policy_id) await this.assertPolicyBelongsToPatient(input.policy_id, patient.id);
    if (input.admission_id) {
      const admission = await this.assertAdmissionInScope(input.admission_id, user);
      if (admission.patient_id !== patient.id) throw new BadRequestException('That admission is not for this patient');
      const existing = await this.prisma.preAuthorizations.findUnique({ where: { admission_id: input.admission_id } });
      if (existing) throw new ConflictException('This admission already has a pre-authorization');
    }

    const row = await this.prisma.preAuthorizations.create({
      data: {
        client_org_id: clinic.client_org_id as string,
        clinic_id: clinic.id,
        patient_id: patient.id,
        payer_id: input.payer_id,
        policy_id: input.policy_id ?? null,
        admission_id: input.admission_id ?? null,
        requested_amount_paise: RUPEES_TO_PAISE(input.requested_amount),
        diagnosis_codes_json: (input.diagnosis_codes as any) ?? null,
        procedure_codes_json: (input.procedure_codes as any) ?? null,
        valid_until: input.valid_until ? new Date(input.valid_until) : null,
        notes: input.notes ?? null,
        requested_by_user_id: user.sub,
      },
    });
    return this.preAuthToGraphQL(await this.fullPreAuthRow(row.id));
  }

  async updatePreAuthorizationStatus(id: string, input: UpdatePreAuthorizationStatusInput, user: JwtPayload) {
    const existing = await this.prisma.preAuthorizations.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pre-authorization not found');
    assertSameOrg(user, existing.client_org_id, 'Pre-authorization');

    const legalNext = PRE_AUTH_TRANSITIONS[existing.status] ?? [];
    if (!legalNext.includes(input.status)) {
      throw new BadRequestException(`Cannot move a pre-authorization from '${existing.status}' to '${input.status}'`);
    }
    if (input.status === 'approved' && input.approved_amount == null) {
      throw new BadRequestException('approved_amount is required when approving a pre-authorization');
    }
    if (input.status === 'rejected' && !input.rejection_reason) {
      throw new BadRequestException('rejection_reason is required when rejecting a pre-authorization');
    }

    const updated = await this.prisma.preAuthorizations.update({
      where: { id },
      data: {
        status: input.status,
        approved_amount_paise: input.status === 'approved' ? RUPEES_TO_PAISE(input.approved_amount!) : existing.approved_amount_paise,
        preauth_number: input.preauth_number ?? existing.preauth_number,
        rejection_reason: input.status === 'rejected' ? input.rejection_reason : existing.rejection_reason,
        decided_at: ['approved', 'rejected'].includes(input.status) ? new Date() : existing.decided_at,
      },
    });
    return this.preAuthToGraphQL(await this.fullPreAuthRow(updated.id));
  }

  // See the schema.prisma model comment on why this is a dedicated
  // mutation rather than folded into admissions.service.ts's own
  // createAdmission -- the @unique constraint on admission_id is what
  // makes "a second admission can't bind the same pre-auth" a real
  // database guarantee, not a race an application check could miss.
  async bindPreAuthorizationToAdmission(input: BindPreAuthorizationToAdmissionInput, user: JwtPayload) {
    const preauth = await this.prisma.preAuthorizations.findUnique({ where: { id: input.preauth_id } });
    if (!preauth) throw new NotFoundException('Pre-authorization not found');
    assertSameOrg(user, preauth.client_org_id, 'Pre-authorization');
    if (preauth.status !== 'approved') throw new BadRequestException('Only an approved pre-authorization can be bound to an admission');
    if (preauth.admission_id) throw new ConflictException('This pre-authorization is already bound to an admission');

    const admission = await this.assertAdmissionInScope(input.admission_id, user);
    if (admission.patient_id !== preauth.patient_id) throw new BadRequestException('This pre-authorization was requested for a different patient');

    // Two guarantees, both required, neither substitutes for the other:
    // (1) `WHERE admission_id IS NULL` makes THIS UPDATE atomic against a
    // second concurrent bind of the SAME pre-auth to a DIFFERENT admission
    // -- a plain read-then-write here would let the second caller's write
    // silently clobber the first with no error at all. (2) the real
    // @unique constraint on PreAuthorizations.admission_id is what stops
    // this admission from ending up bound to a DIFFERENT pre-auth
    // concurrently -- caught below as a clean P2002 translation.
    try {
      const result = await this.prisma.preAuthorizations.updateMany({
        where: { id: preauth.id, admission_id: null },
        data: { admission_id: admission.id },
      });
      if (result.count === 0) throw new ConflictException('This pre-authorization is already bound to an admission');
      return this.preAuthToGraphQL(await this.fullPreAuthRow(preauth.id));
    } catch (err: any) {
      if (err?.code === 'P2002') throw new ConflictException('This admission already has a different pre-authorization bound to it');
      throw err;
    }
  }

  // ── Pre-auth enhancements ────────────────────────────────────────────

  async requestPreAuthEnhancement(input: RequestPreAuthEnhancementInput, user: JwtPayload) {
    const preauth = await this.prisma.preAuthorizations.findUnique({ where: { id: input.preauth_id } });
    if (!preauth) throw new NotFoundException('Pre-authorization not found');
    assertSameOrg(user, preauth.client_org_id, 'Pre-authorization');
    if (preauth.status !== 'approved' || !preauth.admission_id) {
      throw new BadRequestException('Only an approved, admission-bound pre-authorization can request an enhancement');
    }

    const bill = await this.prisma.ipdBills.findUnique({ where: { admission_id: preauth.admission_id } });
    // bill_amount_at_request_paise is snapshotted server-side, never
    // caller-supplied -- an admission with no bill yet (no charge has ever
    // posted) snapshots as 0, which is simply the true running total.
    const billAmountPaise = bill?.gross_paise ?? 0;

    const lastSeq = await this.prisma.preAuthEnhancements.findFirst({
      where: { preauth_id: preauth.id },
      orderBy: { sequence_no: 'desc' },
    });

    const row = await this.prisma.preAuthEnhancements.create({
      data: {
        preauth_id: preauth.id,
        sequence_no: (lastSeq?.sequence_no ?? 0) + 1,
        requested_amount_paise: RUPEES_TO_PAISE(input.requested_amount),
        bill_amount_at_request_paise: billAmountPaise,
        reason: input.reason,
        requested_by_user_id: user.sub,
      },
      include: { requested_by: true },
    });
    return this.enhancementToGraphQL(row);
  }

  async decidePreAuthEnhancement(id: string, input: DecidePreAuthEnhancementInput, user: JwtPayload) {
    const enhancement = await this.prisma.preAuthEnhancements.findUnique({
      where: { id },
      include: { preauth: true },
    });
    if (!enhancement) throw new NotFoundException('Enhancement not found');
    assertSameOrg(user, enhancement.preauth.client_org_id, 'Enhancement');

    const legalNext = ENHANCEMENT_TRANSITIONS[enhancement.status] ?? [];
    if (!legalNext.includes(input.status)) {
      throw new BadRequestException(`Cannot move an enhancement from '${enhancement.status}' to '${input.status}'`);
    }
    if (input.status === 'approved' && input.approved_amount == null) {
      throw new BadRequestException('approved_amount is required when approving an enhancement');
    }
    if (input.status === 'rejected' && !input.rejection_reason) {
      throw new BadRequestException('rejection_reason is required when rejecting an enhancement');
    }

    const updated = await this.prisma.preAuthEnhancements.update({
      where: { id },
      data: {
        status: input.status,
        approved_amount_paise: input.status === 'approved' ? RUPEES_TO_PAISE(input.approved_amount!) : enhancement.approved_amount_paise,
        rejection_reason: input.status === 'rejected' ? input.rejection_reason : enhancement.rejection_reason,
        decided_at: new Date(),
      },
      include: { requested_by: true },
    });
    return this.enhancementToGraphQL(updated);
  }

  // ── IPD claims ────────────────────────────────────────────────────────

  async createIpdClaim(input: CreateIpdClaimInput, user: JwtPayload) {
    const admission = await this.assertAdmissionInScope(input.admission_id, user);
    const existing = await this.prisma.ipdClaims.findUnique({ where: { admission_id: admission.id } });
    if (existing) throw new ConflictException('This admission already has a claim');

    const payerId = input.payer_id ?? admission.payer_id;
    if (!payerId) throw new BadRequestException('No payer specified and the admission has no payer routing set');
    await this.assertPayerExists(payerId);
    const policyId = input.policy_id ?? admission.policy_id ?? undefined;
    if (policyId) await this.assertPolicyBelongsToPatient(policyId, admission.patient_id);

    const preauth = await this.prisma.preAuthorizations.findUnique({ where: { admission_id: admission.id } });

    const row = await this.prisma.ipdClaims.create({
      data: {
        client_org_id: admission.client_org_id,
        clinic_id: admission.clinic_id,
        admission_id: admission.id,
        preauth_id: preauth?.id ?? null,
        patient_id: admission.patient_id,
        payer_id: payerId,
        policy_id: policyId ?? null,
        claimed_amount_paise: RUPEES_TO_PAISE(input.claimed_amount),
        notes: input.notes ?? null,
      },
    });
    return this.claimToGraphQL(await this.fullClaimRow(row.id));
  }

  async submitIpdClaim(id: string, user: JwtPayload) {
    const claim = await this.prisma.ipdClaims.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Claim not found');
    assertSameOrg(user, claim.client_org_id, 'Claim');
    const legalNext = CLAIM_TRANSITIONS[claim.status] ?? [];
    if (!legalNext.includes('submitted')) throw new BadRequestException(`Cannot submit a claim from status '${claim.status}'`);

    const claimNumber = await nextDocumentNumber(this.prisma, claim.clinic_id, DOCUMENT_SERIES.IPD_CLAIM, 'IPC');
    const updated = await this.prisma.ipdClaims.update({
      where: { id },
      data: { status: 'submitted', claim_number: claimNumber, submitted_by_user_id: user.sub, submitted_at: new Date() },
    });
    return this.claimToGraphQL(await this.fullClaimRow(updated.id));
  }

  async updateIpdClaimStatus(id: string, input: UpdateIpdClaimStatusInput, user: JwtPayload) {
    const claim = await this.prisma.ipdClaims.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Claim not found');
    assertSameOrg(user, claim.client_org_id, 'Claim');

    const legalNext = CLAIM_TRANSITIONS[claim.status] ?? [];
    if (!legalNext.includes(input.status)) {
      throw new BadRequestException(`Cannot move a claim from '${claim.status}' to '${input.status}'`);
    }
    if ((input.status === 'approved' || input.status === 'partially_approved') && input.approved_amount == null) {
      throw new BadRequestException('approved_amount is required when approving a claim');
    }
    if (input.status === 'rejected' && !input.rejection_reason) {
      throw new BadRequestException('rejection_reason is required when rejecting a claim');
    }

    const updated = await this.prisma.ipdClaims.update({
      where: { id },
      data: {
        status: input.status,
        approved_amount_paise:
          input.status === 'approved' || input.status === 'partially_approved'
            ? RUPEES_TO_PAISE(input.approved_amount!)
            : claim.approved_amount_paise,
        rejection_reason: input.status === 'rejected' ? input.rejection_reason : claim.rejection_reason,
        decided_at: new Date(),
      },
    });
    return this.claimToGraphQL(await this.fullClaimRow(updated.id));
  }

  // The real payer payout -- reuses IpdBillingService#recordPayment
  // verbatim (payment_type: 'payer_settlement', already a live tender
  // type from slice 4), so the settlement is a real posted payment
  // against the actual IPD bill, not a bare status flip on the claim.
  async settleIpdClaim(id: string, input: SettleIpdClaimInput, user: JwtPayload) {
    const claim = await this.prisma.ipdClaims.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Claim not found');
    assertSameOrg(user, claim.client_org_id, 'Claim');
    if (!['approved', 'partially_approved'].includes(claim.status)) {
      throw new BadRequestException('Only an approved (or partially approved) claim can be settled');
    }

    await this.billingService.recordPayment(
      { admission_id: claim.admission_id, payment_type: 'payer_settlement', tenders: input.tenders, notes: input.notes },
      user,
    );

    const updated = await this.prisma.ipdClaims.update({
      where: { id },
      data: { status: 'settled', settled_at: new Date() },
    });
    return this.claimToGraphQL(await this.fullClaimRow(updated.id));
  }

  async addIpdClaimDeduction(input: AddIpdClaimDeductionInput, user: JwtPayload) {
    const claim = await this.prisma.ipdClaims.findUnique({ where: { id: input.claim_id } });
    if (!claim) throw new NotFoundException('Claim not found');
    assertSameOrg(user, claim.client_org_id, 'Claim');
    if (claim.status === 'settled') throw new BadRequestException('Cannot add a deduction to a settled claim');

    if (input.charge_id) {
      const charge = await this.prisma.ipdCharges.findUnique({ where: { id: input.charge_id } });
      if (!charge || charge.admission_id !== claim.admission_id) {
        throw new BadRequestException('That charge does not belong to this claim’s admission');
      }
    }

    const row = await this.prisma.ipdClaimDeductions.create({
      data: {
        claim_id: claim.id,
        charge_id: input.charge_id ?? null,
        description: input.description,
        deducted_amount_paise: RUPEES_TO_PAISE(input.deducted_amount),
      },
      include: { charge: true },
    });
    return this.deductionToGraphQL(row);
  }

  async removeIpdClaimDeduction(id: string, user: JwtPayload) {
    const deduction = await this.prisma.ipdClaimDeductions.findUnique({ where: { id }, include: { claim: true } });
    if (!deduction) throw new NotFoundException('Deduction not found');
    assertSameOrg(user, deduction.claim.client_org_id, 'Deduction');
    if (deduction.claim.status === 'settled') throw new BadRequestException('Cannot remove a deduction from a settled claim');
    await this.prisma.ipdClaimDeductions.delete({ where: { id } });
    return { success: true, userErrors: [] };
  }

  // ── Documents ─────────────────────────────────────────────────────────

  async createIpdInsuranceDocument(input: CreateIpdInsuranceDocumentInput, user: JwtPayload) {
    if ((!input.preauth_id && !input.claim_id) || (input.preauth_id && input.claim_id)) {
      throw new BadRequestException('Provide exactly one of preauth_id or claim_id');
    }
    let clientOrgId: string;
    if (input.preauth_id) {
      const preauth = await this.prisma.preAuthorizations.findUnique({ where: { id: input.preauth_id } });
      if (!preauth) throw new NotFoundException('Pre-authorization not found');
      assertSameOrg(user, preauth.client_org_id, 'Pre-authorization');
      clientOrgId = preauth.client_org_id;
    } else {
      const claim = await this.prisma.ipdClaims.findUnique({ where: { id: input.claim_id } });
      if (!claim) throw new NotFoundException('Claim not found');
      assertSameOrg(user, claim.client_org_id, 'Claim');
      clientOrgId = claim.client_org_id;
    }

    const row = await this.prisma.ipdInsuranceDocuments.create({
      data: {
        client_org_id: clientOrgId,
        preauth_id: input.preauth_id ?? null,
        claim_id: input.claim_id ?? null,
        document_type: input.document_type,
        file_ref: input.file_ref,
        mime_type: input.mime_type,
        notes: input.notes ?? null,
        uploaded_by_user_id: user.sub,
      },
      include: { uploaded_by: true },
    });
    return this.documentToGraphQL(row);
  }

  // ── Reads ─────────────────────────────────────────────────────────────

  private readonly PREAUTH_INCLUDE = {
    patient: true,
    payer: true,
    admission: true,
    requested_by: true,
    enhancements: { include: { requested_by: true }, orderBy: { sequence_no: 'asc' as const } },
  };

  private async fullPreAuthRow(id: string) {
    return this.prisma.preAuthorizations.findUniqueOrThrow({ where: { id }, include: this.PREAUTH_INCLUDE });
  }

  async findPreAuthorizations(clinicId: string | undefined, status: string | undefined, user: JwtPayload) {
    const rows = await this.prisma.preAuthorizations.findMany({
      where: { ...(clinicId ? { clinic_id: clinicId } : {}), ...(status ? { status } : {}), ...orgScope(user) },
      include: this.PREAUTH_INCLUDE,
      orderBy: { requested_at: 'desc' },
      take: 200,
    });
    return rows.map((r) => this.preAuthToGraphQL(r));
  }

  async findPreAuthorization(id: string, user: JwtPayload) {
    const row = await this.prisma.preAuthorizations.findUnique({ where: { id }, include: this.PREAUTH_INCLUDE });
    if (!row || !isSameOrg(user, row.client_org_id)) throw new NotFoundException('Pre-authorization not found');
    return this.preAuthToGraphQL(row);
  }

  async findPreAuthorizationForAdmission(admissionId: string, user: JwtPayload) {
    await this.assertAdmissionInScope(admissionId, user);
    const row = await this.prisma.preAuthorizations.findUnique({ where: { admission_id: admissionId }, include: this.PREAUTH_INCLUDE });
    return row ? this.preAuthToGraphQL(row) : null;
  }

  private readonly CLAIM_INCLUDE = {
    admission: { include: { patient: true } },
    payer: true,
    submitted_by: true,
    deductions: { include: { charge: true }, orderBy: { created_at: 'desc' as const } },
  };

  private async fullClaimRow(id: string) {
    return this.prisma.ipdClaims.findUniqueOrThrow({ where: { id }, include: this.CLAIM_INCLUDE });
  }

  async findIpdClaims(clinicId: string | undefined, status: string | undefined, user: JwtPayload) {
    const rows = await this.prisma.ipdClaims.findMany({
      where: { ...(clinicId ? { clinic_id: clinicId } : {}), ...(status ? { status } : {}), ...orgScope(user) },
      include: this.CLAIM_INCLUDE,
      orderBy: { created_at: 'desc' },
      take: 200,
    });
    return rows.map((r) => this.claimToGraphQL(r));
  }

  async findIpdClaim(id: string, user: JwtPayload) {
    const row = await this.prisma.ipdClaims.findUnique({ where: { id }, include: this.CLAIM_INCLUDE });
    if (!row || !isSameOrg(user, row.client_org_id)) throw new NotFoundException('Claim not found');
    return this.claimToGraphQL(row);
  }

  async findIpdClaimForAdmission(admissionId: string, user: JwtPayload) {
    await this.assertAdmissionInScope(admissionId, user);
    const row = await this.prisma.ipdClaims.findUnique({ where: { admission_id: admissionId }, include: this.CLAIM_INCLUDE });
    return row ? this.claimToGraphQL(row) : null;
  }

  // ── Shaping ───────────────────────────────────────────────────────────

  private enhancementToGraphQL(e: any) {
    return {
      id: e.id,
      sequence_no: e.sequence_no,
      requested_amount: PAISE_TO_RUPEES(e.requested_amount_paise),
      approved_amount: e.approved_amount_paise != null ? PAISE_TO_RUPEES(e.approved_amount_paise) : undefined,
      status: e.status,
      bill_amount_at_request: PAISE_TO_RUPEES(e.bill_amount_at_request_paise),
      reason: e.reason,
      rejection_reason: e.rejection_reason ?? undefined,
      requested_by_name: this.fullName(e.requested_by),
      requested_at: e.requested_at,
      decided_at: e.decided_at ?? undefined,
    };
  }

  private preAuthToGraphQL(p: any) {
    const approvedEnhancements = (p.enhancements ?? []).filter((e: any) => e.status === 'approved');
    const authorizedTotalPaise =
      (p.approved_amount_paise ?? 0) + approvedEnhancements.reduce((sum: number, e: any) => sum + (e.approved_amount_paise ?? 0), 0);
    return {
      id: p.id,
      clinic_id: p.clinic_id,
      patient_id: p.patient_id,
      patient_name: this.fullName(p.patient),
      payer_id: p.payer_id,
      payer_name: p.payer?.name,
      policy_id: p.policy_id ?? undefined,
      admission_id: p.admission_id ?? undefined,
      admission_number: p.admission?.admission_number,
      status: p.status,
      requested_amount: PAISE_TO_RUPEES(p.requested_amount_paise),
      approved_amount: p.approved_amount_paise != null ? PAISE_TO_RUPEES(p.approved_amount_paise) : undefined,
      authorized_total: PAISE_TO_RUPEES(authorizedTotalPaise),
      preauth_number: p.preauth_number ?? undefined,
      diagnosis_codes: p.diagnosis_codes_json ?? [],
      procedure_codes: p.procedure_codes_json ?? [],
      valid_until: p.valid_until ?? undefined,
      rejection_reason: p.rejection_reason ?? undefined,
      notes: p.notes ?? undefined,
      requested_by_name: this.fullName(p.requested_by),
      requested_at: p.requested_at,
      decided_at: p.decided_at ?? undefined,
      enhancements: (p.enhancements ?? []).map((e: any) => this.enhancementToGraphQL(e)),
      created_at: p.created_at,
    };
  }

  private deductionToGraphQL(d: any) {
    return {
      id: d.id,
      charge_id: d.charge_id ?? undefined,
      charge_description: d.charge?.description,
      description: d.description,
      deducted_amount: PAISE_TO_RUPEES(d.deducted_amount_paise),
      created_at: d.created_at,
    };
  }

  private claimToGraphQL(c: any) {
    const totalDeductionsPaise = (c.deductions ?? []).reduce((sum: number, d: any) => sum + d.deducted_amount_paise, 0);
    return {
      id: c.id,
      clinic_id: c.clinic_id,
      admission_id: c.admission_id,
      admission_number: c.admission?.admission_number,
      patient_name: this.fullName(c.admission?.patient),
      preauth_id: c.preauth_id ?? undefined,
      payer_id: c.payer_id,
      payer_name: c.payer?.name,
      policy_id: c.policy_id ?? undefined,
      status: c.status,
      claimed_amount: PAISE_TO_RUPEES(c.claimed_amount_paise),
      approved_amount: c.approved_amount_paise != null ? PAISE_TO_RUPEES(c.approved_amount_paise) : undefined,
      total_deductions: PAISE_TO_RUPEES(totalDeductionsPaise),
      claim_number: c.claim_number ?? undefined,
      rejection_reason: c.rejection_reason ?? undefined,
      notes: c.notes ?? undefined,
      submitted_by_name: this.fullName(c.submitted_by),
      submitted_at: c.submitted_at ?? undefined,
      decided_at: c.decided_at ?? undefined,
      settled_at: c.settled_at ?? undefined,
      deductions: (c.deductions ?? []).map((d: any) => this.deductionToGraphQL(d)),
      created_at: c.created_at,
    };
  }

  private documentToGraphQL(d: any) {
    return {
      id: d.id,
      preauth_id: d.preauth_id ?? undefined,
      claim_id: d.claim_id ?? undefined,
      document_type: d.document_type,
      file_ref: d.file_ref,
      mime_type: d.mime_type,
      notes: d.notes ?? undefined,
      uploaded_by_name: this.fullName(d.uploaded_by),
      uploaded_at: d.uploaded_at,
    };
  }
}
