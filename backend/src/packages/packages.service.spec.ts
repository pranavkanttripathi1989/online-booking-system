import { Test, TestingModule } from '@nestjs/testing';
import { PackagesService } from './packages.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('PackagesService', () => {
  let service: PackagesService;
  let prisma: any;

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a' } as JwtPayload;
  const orgBUser: JwtPayload = { sub: 'u2', roles: ['manager'], client_org_id: 'org-b' } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u3', roles: ['admin'], client_org_id: null } as JwtPayload;

  const clinicA = { id: 'clinic-a', client_org_id: 'org-a', is_deleted: false };
  const clinicB = { id: 'clinic-b', client_org_id: 'org-b', is_deleted: false };

  const pkgRow = {
    id: 'pkg-a1', client_org_id: 'org-a', clinic_id: 'clinic-a', name: '10-Session Physio',
    description: null, total_sittings: 10, price_paise: 500000, validity_days: 90,
    is_active: true, is_deleted: false, clinic: clinicA, items: [{ id: 'pi-1', product_id: 'prod-1' }],
  };

  beforeEach(async () => {
    prisma = {
      packages: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn() },
      packageItems: { createMany: jest.fn() },
      patientPackages: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      clinics: { findUnique: jest.fn() },
      products: { findMany: jest.fn() },
      patients: { findUnique: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [PackagesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(PackagesService);
  });

  describe('list', () => {
    it('with no clinic_id, returns every active package across the caller\'s own org only', async () => {
      prisma.packages.findMany.mockResolvedValue([pkgRow]);
      const result = await service.list(undefined, orgAUser);
      expect(result).toHaveLength(1);
      expect(prisma.packages.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ clinic: { client_org_id: 'org-a' } }),
      }));
    });

    it('with no clinic_id, org B\'s caller is scoped to org B only', async () => {
      prisma.packages.findMany.mockResolvedValue([]);
      await service.list(undefined, orgBUser);
      expect(prisma.packages.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ clinic: { client_org_id: 'org-b' } }),
      }));
    });

    it('returns [] for a cross-org clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      expect(await service.list('clinic-b', orgAUser)).toEqual([]);
      expect(prisma.packages.findMany).not.toHaveBeenCalled();
    });

    it('lists packages for an in-scope clinic, converting paise to rupees', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.packages.findMany.mockResolvedValue([pkgRow]);
      const result = await service.list('clinic-a', orgAUser);
      expect(result[0].price).toBe(5000);
    });
  });

  describe('create', () => {
    it('rejects a cross-org clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      const result = await service.create({ clinic_id: 'clinic-b', name: 'x', total_sittings: 10, price: 100, product_ids: ['p1'] }, orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.packages.create).not.toHaveBeenCalled();
    });

    it('rejects a clinic with no organization to anchor to', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ ...clinicA, client_org_id: null });
      const result = await service.create({ clinic_id: 'clinic-a', name: 'x', total_sittings: 10, price: 100, product_ids: ['p1'] }, platformUser);
      expect(result.success).toBe(false);
      expect(prisma.packages.create).not.toHaveBeenCalled();
    });

    it('rejects a product that does not belong to this clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.products.findMany.mockResolvedValue([{ id: 'prod-1', clinic_id: 'clinic-b' }]);
      const result = await service.create({ clinic_id: 'clinic-a', name: 'x', total_sittings: 10, price: 100, product_ids: ['prod-1'] }, orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.packages.create).not.toHaveBeenCalled();
    });

    it('rejects when a product_id does not exist at all', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.products.findMany.mockResolvedValue([]);
      const result = await service.create({ clinic_id: 'clinic-a', name: 'x', total_sittings: 10, price: 100, product_ids: ['ghost'] }, orgAUser);
      expect(result.success).toBe(false);
    });

    it('creates a package with its items in one transaction, converting rupees to paise', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.products.findMany.mockResolvedValue([{ id: 'prod-1', clinic_id: 'clinic-a' }]);
      prisma.packages.create.mockResolvedValue({ id: 'pkg-a1' });
      prisma.packages.findUnique.mockResolvedValue(pkgRow);
      const result = await service.create({ clinic_id: 'clinic-a', name: '10-Session Physio', total_sittings: 10, price: 5000, product_ids: ['prod-1'] }, orgAUser);
      expect(result.success).toBe(true);
      expect(prisma.packages.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ price_paise: 500000, client_org_id: 'org-a' }),
      }));
      expect(prisma.packageItems.createMany).toHaveBeenCalledWith(expect.objectContaining({
        data: [{ package_id: 'pkg-a1', product_id: 'prod-1' }],
      }));
    });
  });

  describe('update / remove', () => {
    it('rejects updating a cross-org package', async () => {
      prisma.packages.findUnique.mockResolvedValue({ ...pkgRow, clinic: clinicB });
      const result = await service.update('pkg-a1', { name: 'x' }, orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.packages.update).not.toHaveBeenCalled();
    });

    it('rejects deleting a cross-org package', async () => {
      prisma.packages.findUnique.mockResolvedValue({ ...pkgRow, clinic: clinicB });
      const result = await service.remove('pkg-a1', orgAUser);
      expect(result.success).toBe(false);
    });
  });

  describe('purchase', () => {
    it('rejects a cross-org package', async () => {
      prisma.packages.findUnique.mockResolvedValue({ ...pkgRow, clinic: clinicB });
      const result = await service.purchase({ package_id: 'pkg-a1', patient_id: 'pat-1', purchase_tender_type: 'cash' }, orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.patientPackages.create).not.toHaveBeenCalled();
    });

    it('rejects purchasing an inactive package', async () => {
      prisma.packages.findUnique.mockResolvedValue({ ...pkgRow, is_active: false });
      const result = await service.purchase({ package_id: 'pkg-a1', patient_id: 'pat-1', purchase_tender_type: 'cash' }, orgAUser);
      expect(result.success).toBe(false);
    });

    it('rejects a nonexistent patient', async () => {
      prisma.packages.findUnique.mockResolvedValue(pkgRow);
      prisma.patients.findUnique.mockResolvedValue(null);
      const result = await service.purchase({ package_id: 'pkg-a1', patient_id: 'pat-1', purchase_tender_type: 'cash' }, orgAUser);
      expect(result.success).toBe(false);
    });

    it('creates a PatientPackages row with denormalized sittings/amount and a 90-day expiry', async () => {
      prisma.packages.findUnique.mockResolvedValue(pkgRow);
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', is_deleted: false });
      prisma.patientPackages.create.mockResolvedValue({
        id: 'pp-1', package_id: 'pkg-a1', patient_id: 'pat-1', sittings_total: 10, sittings_remaining: 10,
        purchase_amount_paise: 500000, purchase_tender_type: 'cash', purchase_reference: null,
        purchased_at: new Date(), expires_at: new Date(Date.now() + 90 * 86400000), package: pkgRow,
      });
      const result = await service.purchase({ package_id: 'pkg-a1', patient_id: 'pat-1', purchase_tender_type: 'cash' }, orgAUser);
      expect(result.success).toBe(true);
      const data = prisma.patientPackages.create.mock.calls[0][0].data;
      expect(data.sittings_total).toBe(10);
      expect(data.sittings_remaining).toBe(10);
      expect(data.purchase_amount_paise).toBe(500000);
      const daysUntilExpiry = (data.expires_at.getTime() - Date.now()) / 86400000;
      expect(daysUntilExpiry).toBeGreaterThan(89);
      expect(daysUntilExpiry).toBeLessThanOrEqual(90);
    });
  });

  describe('patientPackages', () => {
    it('scopes to the caller\'s own org', async () => {
      await service.patientPackages('pat-1', orgAUser);
      expect(prisma.patientPackages.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ patient_id: 'pat-1', client_org_id: 'org-a' }),
      }));
    });

    it('computes is_expired from expires_at', async () => {
      prisma.patientPackages.findMany.mockResolvedValue([
        { id: 'pp-1', package_id: 'pkg-a1', patient_id: 'pat-1', sittings_total: 10, sittings_remaining: 3, purchase_amount_paise: 500000, purchase_tender_type: 'cash', purchase_reference: null, purchased_at: new Date(), expires_at: new Date(Date.now() - 1000), package: pkgRow },
      ]);
      const result = await service.patientPackages('pat-1', orgAUser);
      expect(result[0].is_expired).toBe(true);
    });
  });
});
