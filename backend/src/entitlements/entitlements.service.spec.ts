import { Test, TestingModule } from '@nestjs/testing';
import { EntitlementsService } from './entitlements.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';

// P1-04
describe('EntitlementsService', () => {
  let service: EntitlementsService;
  let prisma: { clientOrganizations: { findUnique: jest.Mock; findMany: jest.Mock }; planVersions: { findFirst: jest.Mock } };
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    prisma = {
      clientOrganizations: { findUnique: jest.fn(), findMany: jest.fn() },
      planVersions: { findFirst: jest.fn() },
    };
    redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntitlementsService,
        { provide: PrismaService, useValue: prisma },
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();
    service = module.get(EntitlementsService);
  });

  describe('resolveEntitlements', () => {
    it('returns null (ungated) for a null/undefined orgId — a platform operator', async () => {
      expect(await service.resolveEntitlements(null)).toBeNull();
      expect(await service.resolveEntitlements(undefined)).toBeNull();
      expect(prisma.clientOrganizations.findUnique).not.toHaveBeenCalled();
    });

    it('returns null (ungated) for an org with no plan_id assigned — true of every real org today', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue({ plan_id: null });
      const result = await service.resolveEntitlements('org-a');
      expect(result).toBeNull();
      expect(prisma.planVersions.findFirst).not.toHaveBeenCalled();
    });

    it('returns null (ungated) when the assigned plan has no currently-effective version — fails open, not the caller\'s fault', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue({ plan_id: 'plan-1' });
      prisma.planVersions.findFirst.mockResolvedValue(null);
      expect(await service.resolveEntitlements('org-a')).toBeNull();
    });

    it('resolves feature flags and quotas from the currently-effective PlanVersion', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue({ plan_id: 'plan-1' });
      prisma.planVersions.findFirst.mockResolvedValue({
        feature_flags_json: { pharmacy: true, telemedicine: false },
        quotas_json: { max_clinician_seats: 10 },
      });
      const result = await service.resolveEntitlements('org-a');
      expect(result).toEqual({
        featureFlags: { pharmacy: true, telemedicine: false },
        quotas: { max_clinician_seats: 10 },
      });
    });

    it('queries the currently-effective version by effective_from/effective_until bounds, highest version first', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue({ plan_id: 'plan-1' });
      prisma.planVersions.findFirst.mockResolvedValue({ feature_flags_json: {}, quotas_json: {} });
      await service.resolveEntitlements('org-a');
      const call = prisma.planVersions.findFirst.mock.calls[0][0];
      expect(call.where.plan_id).toBe('plan-1');
      expect(call.where.effective_from.lte).toBeInstanceOf(Date);
      expect(call.where.OR).toEqual([{ effective_until: null }, { effective_until: { gt: expect.any(Date) } }]);
      expect(call.orderBy).toEqual({ version: 'desc' });
    });

    it('serves from the Redis cache on a hit, without touching Postgres', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ featureFlags: { pharmacy: true }, quotas: {} }));
      const result = await service.resolveEntitlements('org-a');
      expect(result).toEqual({ featureFlags: { pharmacy: true }, quotas: {} });
      expect(prisma.clientOrganizations.findUnique).not.toHaveBeenCalled();
    });

    it('caches an ungated (null) result too — a real JSON null, not skipped', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue({ plan_id: null });
      await service.resolveEntitlements('org-a');
      expect(redis.set).toHaveBeenCalledWith('entitlements:org:org-a', 'null', 'EX', 300);
    });
  });

  describe('hasFeature', () => {
    it('returns true (allowed) for an ungated org', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue({ plan_id: null });
      expect(await service.hasFeature('org-a', 'pharmacy')).toBe(true);
    });

    it('returns the plan\'s own explicit flag value when the org is gated', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue({ plan_id: 'plan-1' });
      prisma.planVersions.findFirst.mockResolvedValue({ feature_flags_json: { pharmacy: false }, quotas_json: {} });
      expect(await service.hasFeature('org-a', 'pharmacy')).toBe(false);
    });

    it('defaults to false (not granted) for a gated org whose plan never mentions this flag at all', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue({ plan_id: 'plan-1' });
      prisma.planVersions.findFirst.mockResolvedValue({ feature_flags_json: { telemedicine: true }, quotas_json: {} });
      expect(await service.hasFeature('org-a', 'pharmacy')).toBe(false);
    });
  });

  describe('getQuota', () => {
    it('returns null (unlimited) for an ungated org', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue({ plan_id: null });
      expect(await service.getQuota('org-a', 'max_clinician_seats')).toBeNull();
    });

    it('returns null (unlimited) for a gated org whose plan never mentions this quota dimension — asymmetric with hasFeature on purpose', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue({ plan_id: 'plan-1' });
      prisma.planVersions.findFirst.mockResolvedValue({ feature_flags_json: {}, quotas_json: {} });
      expect(await service.getQuota('org-a', 'max_clinician_seats')).toBeNull();
    });

    it('returns the plan\'s own explicit quota value', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue({ plan_id: 'plan-1' });
      prisma.planVersions.findFirst.mockResolvedValue({ feature_flags_json: {}, quotas_json: { max_clinician_seats: 10 } });
      expect(await service.getQuota('org-a', 'max_clinician_seats')).toBe(10);
    });
  });

  describe('invalidateOrg / invalidateOrgsOnPlan', () => {
    it('invalidateOrg deletes exactly that org\'s cache key', async () => {
      await service.invalidateOrg('org-a');
      expect(redis.del).toHaveBeenCalledWith('entitlements:org:org-a');
    });

    it('invalidateOrgsOnPlan deletes the cache key for every org currently on that plan', async () => {
      prisma.clientOrganizations.findMany.mockResolvedValue([{ id: 'org-a' }, { id: 'org-b' }]);
      await service.invalidateOrgsOnPlan('plan-1');
      expect(prisma.clientOrganizations.findMany).toHaveBeenCalledWith({ where: { plan_id: 'plan-1' }, select: { id: true } });
      expect(redis.del).toHaveBeenCalledWith('entitlements:org:org-a', 'entitlements:org:org-b');
    });

    it('invalidateOrgsOnPlan is a no-op (no redis call) when no org is on that plan', async () => {
      prisma.clientOrganizations.findMany.mockResolvedValue([]);
      await service.invalidateOrgsOnPlan('plan-1');
      expect(redis.del).not.toHaveBeenCalled();
    });
  });
});
