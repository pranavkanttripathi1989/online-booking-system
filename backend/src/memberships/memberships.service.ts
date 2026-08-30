import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMembershipPlanInput,
  UpdateMembershipPlanInput,
  EnrollPatientMembershipInput,
  CancelPatientMembershipInput,
} from './dto/membership.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScopeVia, isPlatformOperator, isSameOrg } from '../common/scoping/tenant-scope';

const RUPEES_TO_PAISE = (rupees: number) => Math.round(rupees * 100);
const PAISE_TO_RUPEES = (paise: number) => paise / 100;

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(row: any) {
    return {
      id: row.id,
      clinic_id: row.clinic_id,
      name: row.name,
      description: row.description ?? undefined,
      price_monthly: PAISE_TO_RUPEES(row.price_monthly_paise),
      is_active: row.is_active,
    };
  }

  private toPatientMembershipGraphQL(row: any) {
    return {
      id: row.id,
      membership_plan_id: row.membership_plan_id,
      patient_id: row.patient_id,
      price_monthly: PAISE_TO_RUPEES(row.price_monthly_paise),
      status: row.status,
      enrolled_at: row.enrolled_at,
      cancelled_at: row.cancelled_at ?? undefined,
      membershipPlan: row.membershipPlan ? this.toGraphQL(row.membershipPlan) : undefined,
    };
  }

  private async findScopedClinic(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) return null;
    if (user.client_org_id && clinic.client_org_id !== user.client_org_id) return null;
    return clinic;
  }

  private async findOwnedPlan(id: string, user: JwtPayload) {
    const existing = await this.prisma.membershipPlans.findUnique({ where: { id }, include: { clinic: true } });
    if (!existing || existing.is_deleted) return null;
    if (user.client_org_id && existing.clinic.client_org_id !== user.client_org_id) return null;
    return existing;
  }

  // clinic_id omitted -> every active plan across every clinic in the
  // caller's own org (same "my org's own rows" shape packages.service.ts's
  // own list() already uses) -- needed so patients/detail.jsx's membership
  // dialog can list every plan available to enroll a patient in, without
  // knowing which specific clinic that patient belongs to.
  async listPlans(clinicId: string | undefined, user: JwtPayload) {
    if (!clinicId) {
      const rows = await this.prisma.membershipPlans.findMany({
        where: { is_deleted: false, is_active: true, ...orgScopeVia(user, 'clinic') },
        orderBy: { created_at: 'asc' },
      });
      return rows.map((r) => this.toGraphQL(r));
    }
    const clinic = await this.findScopedClinic(clinicId, user);
    if (!clinic) return [];
    const rows = await this.prisma.membershipPlans.findMany({
      where: { clinic_id: clinicId, is_deleted: false, is_active: true },
      orderBy: { created_at: 'asc' },
    });
    return rows.map((r) => this.toGraphQL(r));
  }

  async createPlan(input: CreateMembershipPlanInput, user: JwtPayload) {
    const clinic = await this.findScopedClinic(input.clinic_id, user);
    if (!clinic) return { success: false, userErrors: [{ message: 'Clinic not found' }] };
    if (!clinic.client_org_id) {
      return { success: false, userErrors: [{ message: 'This clinic has no organization to anchor the plan to' }] };
    }
    try {
      const row = await this.prisma.membershipPlans.create({
        data: {
          client_org_id: clinic.client_org_id,
          clinic_id: input.clinic_id,
          name: input.name,
          description: input.description,
          price_monthly_paise: RUPEES_TO_PAISE(input.price_monthly),
        },
      });
      return { success: true, userErrors: [], membershipPlan: this.toGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to create membership plan' }] };
    }
  }

  async updatePlan(id: string, input: UpdateMembershipPlanInput, user: JwtPayload) {
    const existing = await this.findOwnedPlan(id, user);
    if (!existing) return { success: false, userErrors: [{ message: 'Membership plan not found' }] };
    try {
      const row = await this.prisma.membershipPlans.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          price_monthly_paise: input.price_monthly != null ? RUPEES_TO_PAISE(input.price_monthly) : undefined,
          is_active: input.is_active,
        },
      });
      return { success: true, userErrors: [], membershipPlan: this.toGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to update membership plan' }] };
    }
  }

  async removePlan(id: string, user: JwtPayload) {
    const existing = await this.findOwnedPlan(id, user);
    if (!existing) return { success: false, userErrors: [{ message: 'Membership plan not found' }] };
    try {
      await this.prisma.membershipPlans.update({ where: { id }, data: { is_deleted: true } });
      return { success: true, userErrors: [] };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to delete membership plan' }] };
    }
  }

  // The current active membership, if any -- never a full history (this
  // page shows a single "membership status" chip, not a ledger). Same
  // fail-closed self/org-scope shape as packages.service.ts's own
  // patientPackages() -- isPlatformOperator/isSameOrg, never a bare
  // ternary to `{}` (BUG004's own standing lesson).
  async patientMembership(patientId: string, user: JwtPayload) {
    const row = await this.prisma.patientMemberships.findFirst({
      where: {
        patient_id: patientId,
        status: 'active',
        is_deleted: false,
        ...(isPlatformOperator(user) ? {} : { client_org_id: user.client_org_id ?? '__no_org__' }),
      },
      include: { membershipPlan: true },
    });
    return row ? this.toPatientMembershipGraphQL(row) : null;
  }

  // Cancels any existing active membership for this patient, then creates
  // the new one, inside one transaction -- the migration's own partial
  // unique index (WHERE status='active') is the DB-level backstop this
  // relies on never actually being hit. price_monthly_paise denormalizes
  // from the plan at this exact moment (PatientPackages.purchase_amount_paise's
  // own precedent), so a later catalog price change never silently changes
  // what an existing member is shown as paying.
  async enroll(input: EnrollPatientMembershipInput, user: JwtPayload) {
    const plan = await this.findOwnedPlan(input.membership_plan_id, user);
    if (!plan) return { success: false, userErrors: [{ message: 'Membership plan not found' }] };
    if (!plan.is_active) return { success: false, userErrors: [{ message: 'This membership plan is no longer active' }] };
    const patient = await this.prisma.patients.findUnique({ where: { id: input.patient_id } });
    if (!patient || patient.is_deleted) return { success: false, userErrors: [{ message: 'Patient not found' }] };
    if (!isSameOrg(user, patient.client_org_id)) return { success: false, userErrors: [{ message: 'Patient not found' }] };

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        await tx.patientMemberships.updateMany({
          where: { patient_id: input.patient_id, status: 'active', is_deleted: false },
          data: { status: 'cancelled', cancelled_at: new Date() },
        });
        return tx.patientMemberships.create({
          data: {
            membership_plan_id: plan.id,
            patient_id: input.patient_id,
            client_org_id: plan.client_org_id,
            clinic_id: plan.clinic_id,
            price_monthly_paise: plan.price_monthly_paise,
          },
          include: { membershipPlan: true },
        });
      });
      return { success: true, userErrors: [], patientMembership: this.toPatientMembershipGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to enroll patient in membership' }] };
    }
  }

  async cancel(input: CancelPatientMembershipInput, user: JwtPayload) {
    const existing = await this.prisma.patientMemberships.findFirst({
      where: { patient_id: input.patient_id, status: 'active', is_deleted: false },
    });
    if (!existing) return { success: false, userErrors: [{ message: 'No active membership found for this patient' }] };
    if (!isSameOrg(user, existing.client_org_id)) return { success: false, userErrors: [{ message: 'No active membership found for this patient' }] };

    try {
      const row = await this.prisma.patientMemberships.update({
        where: { id: existing.id },
        data: { status: 'cancelled', cancelled_at: new Date() },
        include: { membershipPlan: true },
      });
      return { success: true, userErrors: [], patientMembership: this.toPatientMembershipGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to cancel membership' }] };
    }
  }
}
