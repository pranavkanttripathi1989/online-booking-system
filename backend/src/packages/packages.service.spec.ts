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
      patientPackages: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), update: jest.fn() },
      packageTransferLog: { create: jest.fn() },
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

    // createProduct never accepts a clinic_id — every real product is an
    // org-level master (clinic_id: null). A strict clinic_id equality
    // check rejected every real product in this codebase (live-confirmed
    // via e2e), so a null clinic_id must be accepted, gated on org instead.
    it('accepts an org-level master product (clinic_id: null) belonging to the same org', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.products.findMany.mockResolvedValue([{ id: 'prod-master', clinic_id: null, client_org_id: 'org-a' }]);
      prisma.packages.create.mockResolvedValue({ id: 'pkg-a1' });
      prisma.packages.findUnique.mockResolvedValue(pkgRow);
      const result = await service.create({ clinic_id: 'clinic-a', name: 'x', total_sittings: 10, price: 100, product_ids: ['prod-master'] }, orgAUser);
      expect(result.success).toBe(true);
    });

    it('rejects an org-level master product belonging to a different org', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.products.findMany.mockResolvedValue([{ id: 'prod-master', clinic_id: null, client_org_id: 'org-b' }]);
      const result = await service.create({ clinic_id: 'clinic-a', name: 'x', total_sittings: 10, price: 100, product_ids: ['prod-master'] }, orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.packages.create).not.toHaveBeenCalled();
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

    // REQ110 — regression guard for the F-01/BUG004 ternary bug fix: a
    // platform operator sees every org's rows (no filter); a real
    // non-platform caller with no org fails closed via the sentinel,
    // never falling through to "see everything".
    it('a platform operator applies no client_org_id filter at all', async () => {
      await service.patientPackages('pat-1', platformUser);
      expect(prisma.patientPackages.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { patient_id: 'pat-1', is_deleted: false },
      }));
    });
  });

  describe('transferPackage (REQ110)', () => {
    const activePatientPackage = {
      id: 'pp-1', client_org_id: 'org-a', patient_id: 'pat-1', sittings_remaining: 5,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    };
    const toPatient = { id: 'pat-2', client_org_id: 'org-a', is_deleted: false };

    it('rejects a nonexistent patient package', async () => {
      prisma.patientPackages.findUnique.mockResolvedValue(null);
      const result = await service.transferPackage({ patient_package_id: 'pp-x', to_patient_id: 'pat-2' }, orgAUser);
      expect(result.success).toBe(false);
    });

    it('rejects a cross-org patient package', async () => {
      prisma.patientPackages.findUnique.mockResolvedValue({ ...activePatientPackage, client_org_id: 'org-b' });
      const result = await service.transferPackage({ patient_package_id: 'pp-1', to_patient_id: 'pat-2' }, orgAUser);
      expect(result.success).toBe(false);
    });

    it('rejects an expired package', async () => {
      prisma.patientPackages.findUnique.mockResolvedValue({ ...activePatientPackage, expires_at: new Date(Date.now() - 1000) });
      const result = await service.transferPackage({ patient_package_id: 'pp-1', to_patient_id: 'pat-2' }, orgAUser);
      expect(result.success).toBe(false);
      expect(result.userErrors[0].message).toMatch(/expired/);
    });

    it('rejects a package with zero sittings remaining', async () => {
      prisma.patientPackages.findUnique.mockResolvedValue({ ...activePatientPackage, sittings_remaining: 0 });
      const result = await service.transferPackage({ patient_package_id: 'pp-1', to_patient_id: 'pat-2' }, orgAUser);
      expect(result.success).toBe(false);
      expect(result.userErrors[0].message).toMatch(/no sittings remaining/);
    });

    it('rejects transferring to the same patient (no-op)', async () => {
      prisma.patientPackages.findUnique.mockResolvedValue(activePatientPackage);
      const result = await service.transferPackage({ patient_package_id: 'pp-1', to_patient_id: 'pat-1' }, orgAUser);
      expect(result.success).toBe(false);
    });

    it('rejects a cross-org target patient', async () => {
      prisma.patientPackages.findUnique.mockResolvedValue(activePatientPackage);
      prisma.patients.findUnique.mockResolvedValue({ ...toPatient, client_org_id: 'org-b' });
      const result = await service.transferPackage({ patient_package_id: 'pp-1', to_patient_id: 'pat-2' }, orgAUser);
      expect(result.success).toBe(false);
    });

    it('happy path — moves ownership and creates a transfer log row', async () => {
      prisma.patientPackages.findUnique.mockResolvedValue(activePatientPackage);
      prisma.patients.findUnique.mockResolvedValue(toPatient);
      prisma.patientPackages.update.mockResolvedValue({ ...activePatientPackage, patient_id: 'pat-2', package: pkgRow });

      const result = await service.transferPackage({ patient_package_id: 'pp-1', to_patient_id: 'pat-2' }, orgAUser);

      expect(result.success).toBe(true);
      expect(prisma.patientPackages.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'pp-1' },
        data: { patient_id: 'pat-2' },
      }));
      expect(prisma.packageTransferLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          patient_package_id: 'pp-1', from_patient_id: 'pat-1', to_patient_id: 'pat-2',
          sittings_at_transfer: 5, transferred_by_user_id: orgAUser.sub, client_org_id: 'org-a',
        }),
      }));
    });
  });
});
