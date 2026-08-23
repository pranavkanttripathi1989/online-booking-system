import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrganizationOnboardingService } from './organization-onboarding.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OrganizationOnboardingService', () => {
  let service: OrganizationOnboardingService;
  let prisma: {
    userProfiles: { findUnique: jest.Mock };
    clientOrganizations: { findUnique: jest.Mock; update: jest.Mock };
    userRoles: { findFirst: jest.Mock };
    subscriptionPlans: { findMany: jest.Mock; findUnique: jest.Mock };
    clinics: { count: jest.Mock };
    $transaction: jest.Mock;
  };

  const inProgressOrg = (overrides = {}) => ({
    id: 'org-1',
    name: 'Sunrise Clinic',
    code: 'sunrise-clinic',
    contact_email: 'owner@sunrise.dev',
    onboarding_status: 'in_progress',
    onboarding_step: 'org_details',
    trial_ends_at: null,
    owner_user_id: 'user-1',
    is_deleted: false,
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      userProfiles: { findUnique: jest.fn() },
      clientOrganizations: { findUnique: jest.fn(), update: jest.fn() },
      userRoles: { findFirst: jest.fn() },
      subscriptionPlans: { findMany: jest.fn(), findUnique: jest.fn() },
      clinics: { count: jest.fn() },
      $transaction: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizationOnboardingService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(OrganizationOnboardingService);
  });

  describe('listActivePlans', () => {
    it('normalizes a non-array features JSON column to an empty list rather than throwing', async () => {
      prisma.subscriptionPlans.findMany.mockResolvedValue([
        { id: 'p1', name: 'Starter', description: '', price_monthly: 1000, price_yearly: 10000, max_clinics: 1, max_users: 5, features: {} },
      ]);
      const result = await service.listActivePlans();
      expect(result[0].features).toEqual([]);
      expect(result[0].priceMonthly).toBe(1000);
    });
  });

  describe('startOnboarding', () => {
    const input = { orgName: 'Sunrise Clinic', contactEmail: 'Owner@Sunrise.dev', ownerName: 'Priya Owner', ownerPassword: 'Passw0rd!' };

    it('rejects an email already used by an existing account, generically', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.startOnboarding(input)).rejects.toThrow(ConflictException);
    });

    it('rejects an organization code already in use', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(null);
      prisma.clientOrganizations.findUnique.mockResolvedValue({ id: 'other-org' });
      await expect(service.startOnboarding(input)).rejects.toThrow(ConflictException);
    });

    it('creates the org and its owner account transactionally, scoped to the new org', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(null);
      prisma.clientOrganizations.findUnique.mockResolvedValue(null);
      prisma.userRoles.findFirst.mockResolvedValue({ id: 'role-manager', name: 'manager' });

      const created = inProgressOrg();
      const userProfilesCreate = jest.fn().mockResolvedValue({ id: 'user-1' });
      const clientOrgUpdate = jest.fn().mockResolvedValue({ ...created, owner_user_id: 'user-1' });
      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          clientOrganizations: { create: jest.fn().mockResolvedValue(created), update: clientOrgUpdate },
          users: { create: jest.fn().mockResolvedValue({ id: 'user-1' }) },
          userProfiles: { create: userProfilesCreate },
        }),
      );

      const result = await service.startOnboarding(input);

      expect(userProfilesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'owner@sunrise.dev', // lowercased
            role_id: 'role-manager',
            client_org_id: 'org-1',
          }),
        }),
      );
      // The owner is never platform-wide (client_org_id: null) — CLAUDE.md:
      // admin/super_admin are the org-less roles, not an org's own owner.
      expect(userProfilesCreate.mock.calls[0][0].data.client_org_id).toBe('org-1');
      expect(result.id).toBe('org-1');
      expect(result.onboardingStatus).toBe('in_progress');
    });
  });

  describe('selectPlan', () => {
    it('rejects an unknown organization', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(null);
      await expect(service.selectPlan('missing-org', 'plan-1')).rejects.toThrow(NotFoundException);
    });

    it('rejects acting on an organization that already completed onboarding', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(inProgressOrg({ onboarding_status: 'completed' }));
      await expect(service.selectPlan('org-1', 'plan-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects a plan id that does not exist or is inactive', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(inProgressOrg());
      prisma.subscriptionPlans.findUnique.mockResolvedValue(null);
      await expect(service.selectPlan('org-1', 'missing-plan')).rejects.toThrow(NotFoundException);
    });

    it('records the subscription and sets a 14-day trial window', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(inProgressOrg());
      prisma.subscriptionPlans.findUnique.mockResolvedValue({ id: 'plan-1', is_active: true, is_deleted: false });
      const subCreate = jest.fn().mockResolvedValue({});
      const orgUpdate = jest.fn().mockResolvedValue(inProgressOrg({ onboarding_step: 'plan_selected' }));
      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({ organizationSubscriptions: { create: subCreate }, clientOrganizations: { update: orgUpdate } }),
      );

      await service.selectPlan('org-1', 'plan-1');

      expect(subCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-1', plan_id: 'plan-1', status: 'trial' }) }),
      );
    });
  });

  describe('complete', () => {
    it('refuses to complete onboarding with zero clinics added', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(inProgressOrg());
      prisma.clinics.count.mockResolvedValue(0);
      await expect(service.complete('org-1')).rejects.toThrow(BadRequestException);
      expect(prisma.clientOrganizations.update).not.toHaveBeenCalled();
    });

    it('marks onboarding completed once at least one clinic exists', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(inProgressOrg());
      prisma.clinics.count.mockResolvedValue(1);
      prisma.clientOrganizations.update.mockResolvedValue(inProgressOrg({ onboarding_status: 'completed', onboarding_step: null }));

      const result = await service.complete('org-1');

      expect(result.onboardingStatus).toBe('completed');
      expect(prisma.clientOrganizations.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ onboarding_status: 'completed' }) }),
      );
    });
  });
});
