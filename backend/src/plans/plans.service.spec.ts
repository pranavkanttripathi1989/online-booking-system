import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from '../entitlements/entitlements.service';

// REQ032 (US-PLAN-01/02) — platform-level, no client_org_id anywhere.
// Versioning is the behaviour under test: editing a live plan must close
// the old version and open a new one, never mutate the old row.
describe('PlansService', () => {
  let service: PlansService;
  let entitlementsService: { invalidateOrgsOnPlan: jest.Mock };
  let prisma: {
    plans: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    planVersions: { update: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };

  const v1 = { id: 'v1', plan_id: 'plan-1', version: 1, effective_from: new Date(), effective_until: null, billing_period: 'monthly', price_paise: 100000, feature_flags_json: { pharmacy: false }, quotas_json: { max_clinician_seats: 5 }, created_at: new Date() };
  const plan1 = { id: 'plan-1', name: 'Starter', tier: 'starter', is_active: true, versions: [v1] };

  beforeEach(async () => {
    prisma = {
      plans: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      planVersions: { update: jest.fn(), create: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };
    entitlementsService = { invalidateOrgsOnPlan: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        { provide: PrismaService, useValue: prisma },
        { provide: EntitlementsService, useValue: entitlementsService },
      ],
    }).compile();
    service = module.get(PlansService);
  });

  it('creates a plan with its first version at version 1, price converted to paise', async () => {
    prisma.plans.create.mockResolvedValue(plan1);
    await service.create({
      name: 'Starter', tier: 'starter', billing_period: 'monthly', price: 1000,
      feature_flags: [{ key: 'pharmacy', enabled: false }],
      quotas: [{ key: 'max_clinician_seats', value: 5 }],
    } as any);
    expect(prisma.plans.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          versions: { create: expect.objectContaining({ version: 1, price_paise: 100000 }) },
        }),
      }),
    );
  });

  it('throws for an unknown plan when creating a new version', async () => {
    prisma.plans.findUnique.mockResolvedValue(null);
    await expect(service.createNewVersion({ plan_id: 'nope' } as any)).rejects.toThrow(BadRequestException);
  });

  it('US-PLAN-02: closes the old open version and creates version 2, never mutating v1 in place', async () => {
    prisma.plans.findUnique
      .mockResolvedValueOnce({ ...plan1, versions: [v1] }) // initial lookup
      .mockResolvedValueOnce({ ...plan1, versions: [v1, { ...v1, id: 'v2', version: 2, effective_until: null }] }); // final re-fetch
    await service.createNewVersion({
      plan_id: 'plan-1', billing_period: 'monthly', price: 1200,
      feature_flags: [{ key: 'pharmacy', enabled: true }],
      quotas: [{ key: 'max_clinician_seats', value: 10 }],
    } as any);
    // v1 is closed (effective_until set), not deleted or overwritten in place.
    expect(prisma.planVersions.update).toHaveBeenCalledWith({
      where: { id: 'v1' },
      data: { effective_until: expect.any(Date) },
    });
    expect(prisma.planVersions.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ plan_id: 'plan-1', version: 2, price_paise: 120000 }) }),
    );
  });

  // P1-04 — every org currently on this plan needs its cached entitlements
  // dropped once its feature flags/quotas actually change.
  it('createNewVersion invalidates the entitlement cache for every org on this plan', async () => {
    prisma.plans.findUnique
      .mockResolvedValueOnce({ ...plan1, versions: [v1] })
      .mockResolvedValueOnce({ ...plan1, versions: [v1, { ...v1, id: 'v2', version: 2, effective_until: null }] });
    await service.createNewVersion({
      plan_id: 'plan-1', billing_period: 'monthly', price: 1200,
      feature_flags: [{ key: 'pharmacy', enabled: true }],
      quotas: [{ key: 'max_clinician_seats', value: 10 }],
    } as any);
    expect(entitlementsService.invalidateOrgsOnPlan).toHaveBeenCalledWith('plan-1');
  });

  it('setActive toggles a plan without touching its versions', async () => {
    prisma.plans.findUnique.mockResolvedValue(plan1);
    prisma.plans.update.mockResolvedValue({ ...plan1, is_active: false });
    const result = await service.setActive('plan-1', false);
    expect(result.is_active).toBe(false);
    expect(prisma.plans.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'plan-1' }, data: { is_active: false } }),
    );
  });

  it('setActive also invalidates the entitlement cache for every org on this plan — is_active gates the whole plan', async () => {
    prisma.plans.findUnique.mockResolvedValue(plan1);
    prisma.plans.update.mockResolvedValue({ ...plan1, is_active: false });
    await service.setActive('plan-1', false);
    expect(entitlementsService.invalidateOrgsOnPlan).toHaveBeenCalledWith('plan-1');
  });
});
