import { Test, TestingModule } from '@nestjs/testing';
import { BranchOverridesService } from './branch-overrides.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('BranchOverridesService', () => {
  let service: BranchOverridesService;
  let prisma: {
    clinics: { findUnique: jest.Mock };
    products: { findUnique: jest.Mock };
    productBranchOverrides: { findMany: jest.Mock; findUnique: jest.Mock; upsert: jest.Mock };
  };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const orgBUser: JwtPayload = { sub: 'u2', roles: ['manager'], client_org_id: 'org-b', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u3', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const clinicA = { id: 'clinic-a', client_org_id: 'org-a', is_deleted: false };
  const masterProduct = { id: 'product-master', client_org_id: 'org-a', clinic_id: null, is_deleted: false };

  beforeEach(async () => {
    prisma = {
      clinics: { findUnique: jest.fn() },
      products: { findUnique: jest.fn() },
      productBranchOverrides: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [BranchOverridesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(BranchOverridesService);
  });

  describe('list', () => {
    it('returns an empty list for a clinic outside the caller\'s org rather than leaking it', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-b', client_org_id: 'org-b', is_deleted: false });
      const result = await service.list('clinic-b', orgAUser);
      expect(result).toEqual([]);
      expect(prisma.productBranchOverrides.findMany).not.toHaveBeenCalled();
    });

    it('returns an empty list for a nonexistent clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue(null);
      const result = await service.list('nope', orgAUser);
      expect(result).toEqual([]);
    });

    it('lists overrides for a clinic in the caller\'s own org', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.productBranchOverrides.findMany.mockResolvedValue([
        { id: 'row-1', product_id: 'product-master', clinic_id: 'clinic-a', mode: 'override', override_price: 30000, product: { id: 'product-master', name: 'Consult', price: 50000 } },
      ]);
      const result = await service.list('clinic-a', orgAUser);
      expect(result).toEqual([
        { id: 'row-1', product_id: 'product-master', clinic_id: 'clinic-a', mode: 'override', override_price: 300, product: { id: 'product-master', name: 'Consult', price: 500 } },
      ]);
    });

    it('a platform operator (org-less) can list any clinic\'s overrides', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-b', client_org_id: 'org-b', is_deleted: false });
      prisma.productBranchOverrides.findMany.mockResolvedValue([]);
      const result = await service.list('clinic-b', platformUser);
      expect(result).toEqual([]);
      expect(prisma.productBranchOverrides.findMany).toHaveBeenCalled();
    });

    // REQ055 — omitted clinic_id: org-wide list, no clinic lookup performed.
    it('lists every branch override across the caller\'s own org when clinic_id is omitted', async () => {
      prisma.productBranchOverrides.findMany.mockResolvedValue([]);
      const result = await service.list(undefined, orgAUser);
      expect(result).toEqual([]);
      expect(prisma.clinics.findUnique).not.toHaveBeenCalled();
      expect(prisma.productBranchOverrides.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
    });

    it('scopes the org-wide list to org-B, not org-A, for an org-B caller', async () => {
      prisma.productBranchOverrides.findMany.mockResolvedValue([]);
      await service.list(undefined, orgBUser);
      expect(prisma.productBranchOverrides.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-b' }) }),
      );
    });
  });

  describe('set', () => {
    it('rejects a clinic outside the caller\'s org', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-b', client_org_id: 'org-b', is_deleted: false });
      const result = await service.set({ product_id: 'product-master', clinic_id: 'clinic-b', mode: 'inherit' } as any, orgAUser);
      expect(result).toEqual({ success: false, userErrors: [{ message: 'Clinic not found' }] });
      expect(prisma.productBranchOverrides.upsert).not.toHaveBeenCalled();
    });

    it('rejects a product belonging to a different org than the clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.products.findUnique.mockResolvedValue({ ...masterProduct, client_org_id: 'org-b' });
      const result = await service.set({ product_id: 'product-master', clinic_id: 'clinic-a', mode: 'inherit' } as any, orgAUser);
      expect(result.success).toBe(false);
    });

    it('rejects a service that is already clinic-scoped (not an org master, nothing to cascade from)', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.products.findUnique.mockResolvedValue({ ...masterProduct, clinic_id: 'clinic-a' });
      const result = await service.set({ product_id: 'product-master', clinic_id: 'clinic-a', mode: 'override', override_price: 100 } as any, orgAUser);
      expect(result.success).toBe(false);
      expect(result.userErrors[0].message).toMatch(/not an org-level master/i);
    });

    it('rejects an override with no price, category, or channel value given', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.products.findUnique.mockResolvedValue(masterProduct);
      const result = await service.set({ product_id: 'product-master', clinic_id: 'clinic-a', mode: 'override' } as any, orgAUser);
      expect(result.success).toBe(false);
      expect(result.userErrors[0].message).toMatch(/requires at least/i);
    });

    it('upserts a branch override, converting rupees to paise and stamping the clinic\'s own org', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.products.findUnique.mockResolvedValue(masterProduct);
      prisma.productBranchOverrides.upsert.mockResolvedValue({
        id: 'row-1', product_id: 'product-master', clinic_id: 'clinic-a', mode: 'override', override_price: 30000, product: masterProduct,
      });

      const result = await service.set({ product_id: 'product-master', clinic_id: 'clinic-a', mode: 'override', override_price: 300 } as any, orgAUser);

      expect(result.success).toBe(true);
      expect(prisma.productBranchOverrides.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { product_id_clinic_id: { product_id: 'product-master', clinic_id: 'clinic-a' } },
          create: expect.objectContaining({ client_org_id: 'org-a', mode: 'override', override_price: 30000 }),
        }),
      );
    });
  });

  describe('getForPricing', () => {
    it('returns null when clinicId or productId is missing (no lookup performed)', async () => {
      expect(await service.getForPricing('product-master', null)).toBeNull();
      expect(await service.getForPricing(null, 'clinic-a')).toBeNull();
      expect(prisma.productBranchOverrides.findUnique).not.toHaveBeenCalled();
    });

    it('returns null when the branch has no override row (today\'s existing default behaviour)', async () => {
      prisma.productBranchOverrides.findUnique.mockResolvedValue(null);
      expect(await service.getForPricing('product-master', 'clinic-a')).toBeNull();
    });

    it('returns the raw paise-unit row for the shared pricing helper to consume', async () => {
      prisma.productBranchOverrides.findUnique.mockResolvedValue({
        mode: 'override', override_price: 30000, override_category_pricing_json: { corporate: 25000 }, override_channel_pricing_json: null,
      });
      const result = await service.getForPricing('product-master', 'clinic-a');
      expect(result).toEqual({ mode: 'override', override_price: 30000, override_category_pricing_json: { corporate: 25000 }, override_channel_pricing_json: null });
    });
  });
});
