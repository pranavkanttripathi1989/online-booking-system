import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import {
  PayerInput,
  PayerEmpanelmentInput,
  UpdatePayerEmpanelmentStatusInput,
  PatientInsurancePolicyInput,
} from './dto/insurance.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, orgIdForWrite, isSameOrg } from '../common/scoping/tenant-scope';

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
}
