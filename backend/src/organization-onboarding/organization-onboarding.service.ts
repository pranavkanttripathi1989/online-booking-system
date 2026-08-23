import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { BCRYPT_COST } from '../common/crypto/bcrypt-cost';
import { normalizeOrgCode } from '../organizations/organizations.service';
import { StartOnboardingInput, AddOnboardingClinicInput } from './dto/organization-onboarding.input';

const TRIAL_DAYS = 14;

@Injectable()
export class OrganizationOnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(org: any) {
    return {
      id: org.id,
      name: org.name,
      code: org.code,
      contactEmail: org.contact_email,
      onboardingStatus: org.onboarding_status,
      onboardingStep: org.onboarding_step ?? undefined,
      trialEndsAt: org.trial_ends_at ?? undefined,
      ownerUserId: org.owner_user_id ?? undefined,
    };
  }

  async listActivePlans() {
    const plans = await this.prisma.subscriptionPlans.findMany({
      where: { is_active: true, is_deleted: false },
      orderBy: { price_monthly: 'asc' },
    });
    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      priceMonthly: p.price_monthly,
      priceYearly: p.price_yearly,
      maxClinics: p.max_clinics ?? undefined,
      maxUsers: p.max_users ?? undefined,
      features: Array.isArray(p.features) ? (p.features as string[]) : [],
    }));
  }

  // Transactional: the org row and its owner's login account are created
  // together or not at all — a half-created org with no way to sign in
  // would be worse than the request simply failing.
  async startOnboarding(input: StartOnboardingInput) {
    const email = input.contactEmail.toLowerCase();
    const existingUser = await this.prisma.userProfiles.findUnique({ where: { email } });
    if (existingUser) {
      // Deliberately generic, mirroring auth.service.ts's register() —
      // doesn't confirm the email exists any more precisely than this.
      throw new ConflictException('Unable to create account with these details');
    }

    const code = normalizeOrgCode(input.slug || input.orgName);
    if (!code) {
      throw new BadRequestException('Organization name must contain at least one letter or digit');
    }
    const existingCode = await this.prisma.clientOrganizations.findUnique({ where: { code } });
    if (existingCode) {
      throw new ConflictException(`Organization code "${code}" is already in use`);
    }

    // The org owner manages their own tenant — 'manager' is the org-scoped
    // role for this (CLAUDE.md: 'admin'/'super_admin' are platform-wide,
    // client_org_id: null, not per-org owners).
    const managerRole = await this.prisma.userRoles.findFirst({
      where: { client_org_id: null, name: 'manager' },
    });
    if (!managerRole) {
      throw new Error('Seeded "manager" role not found — check prisma/seed.ts ROLES');
    }

    const hashed = await bcrypt.hash(input.ownerPassword, BCRYPT_COST);
    const [firstName, ...rest] = input.ownerName.trim().split(/\s+/);

    const org = await this.prisma.$transaction(async (tx) => {
      const created = await tx.clientOrganizations.create({
        data: {
          name: input.orgName,
          code,
          contact_email: email,
          onboarding_status: 'in_progress',
          onboarding_step: 'org_details',
        },
      });
      const user = await tx.users.create({ data: {} });
      await tx.userProfiles.create({
        data: {
          id: user.id,
          email,
          password: hashed,
          first_name: firstName || input.ownerName,
          last_name: rest.join(' '),
          role_id: managerRole.id,
          client_org_id: created.id,
        },
      });
      return tx.clientOrganizations.update({
        where: { id: created.id },
        data: { owner_user_id: user.id },
      });
    });

    return this.toGraphQL(org);
  }

  private async findInProgressOrg(orgId: string) {
    const org = await this.prisma.clientOrganizations.findUnique({ where: { id: orgId } });
    if (!org || org.is_deleted) {
      throw new NotFoundException('Organization not found');
    }
    // The wizard can only act on an org still mid-onboarding — once
    // completed, this anonymous path has no further business touching it
    // (further changes go through the authenticated admin-CRUD resolver).
    if (org.onboarding_status === 'completed') {
      throw new BadRequestException('This organization has already completed onboarding');
    }
    return org;
  }

  async selectPlan(orgId: string, planId: string) {
    await this.findInProgressOrg(orgId);
    const plan = await this.prisma.subscriptionPlans.findUnique({ where: { id: planId } });
    if (!plan || !plan.is_active || plan.is_deleted) {
      throw new NotFoundException('Plan not found');
    }

    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const org = await this.prisma.$transaction(async (tx) => {
      await tx.organizationSubscriptions.create({
        data: {
          client_org_id: orgId,
          plan_id: plan.id,
          status: 'trial',
          billing_cycle: 'monthly',
          current_period_end: trialEndsAt,
        },
      });
      return tx.clientOrganizations.update({
        where: { id: orgId },
        data: { onboarding_step: 'plan_selected', trial_ends_at: trialEndsAt },
      });
    });

    return this.toGraphQL(org);
  }

  async addFirstClinic(orgId: string, input: AddOnboardingClinicInput) {
    const org = await this.findInProgressOrg(orgId);

    const clinic = await this.prisma.$transaction(async (tx) => {
      const created = await tx.clinics.create({
        data: {
          name: input.name,
          address: input.address ?? '',
          city: input.city,
          postcode: input.pincode,
          phone: input.phone ?? '',
          email: org.contact_email,
          client_org_id: orgId,
          // The wizard's only clinic becomes the org's head office by
          // definition — there is nothing else it could be (REQ041).
          is_primary: true,
        },
      });
      await tx.clientOrganizations.update({
        where: { id: orgId },
        data: { onboarding_step: 'first_clinic_added' },
      });
      return created;
    });

    return clinic;
  }

  async complete(orgId: string) {
    const org = await this.findInProgressOrg(orgId);
    const clinicCount = await this.prisma.clinics.count({ where: { client_org_id: orgId, is_deleted: false } });
    if (clinicCount === 0) {
      throw new BadRequestException('Add at least one clinic before completing onboarding');
    }

    const updated = await this.prisma.clientOrganizations.update({
      where: { id: org.id },
      data: { onboarding_status: 'completed', onboarding_step: null, onboarded_at: new Date() },
    });
    return this.toGraphQL(updated);
  }
}
