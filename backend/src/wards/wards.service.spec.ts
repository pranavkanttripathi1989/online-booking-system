import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { WardsService } from './wards.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('WardsService', () => {
  let service: WardsService;
  let prisma: any;

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const orgBUser: JwtPayload = { sub: 'u2', roles: ['manager'], client_org_id: 'org-b', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u3', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const clinicA = { id: 'clinic-a', is_deleted: false, client_org_id: 'org-a' };
  const productA = { id: 'product-a', is_deleted: false, client_org_id: null, clinic: { client_org_id: 'org-a' } };
  const wardA = {
    id: 'ward-a',
    client_org_id: 'org-a',
    clinic_id: 'clinic-a',
    name: 'Ward A',
    ward_type: 'general',
    gender_policy: 'mixed',
    is_active: true,
    is_deleted: false,
    bed_charge_product_id: null,
    nursing_charge_product_id: null,
    beds: [],
    created_at: new Date(),
  };
  const bedA = {
    id: 'bed-a',
    client_org_id: 'org-a',
    clinic_id: 'clinic-a',
    ward_id: 'ward-a',
    bed_number: 'A-01',
    status: 'available',
    is_active: true,
    is_deleted: false,
    ward: wardA,
    created_at: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      clinics: { findUnique: jest.fn() },
      products: { findUnique: jest.fn() },
      wards: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      beds: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
      bedOccupancies: { create: jest.fn(), updateMany: jest.fn() },
      $transaction: jest.fn((arg) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg))),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WardsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(WardsService);
  });

  describe('findAllWards', () => {
    it('scopes to the caller org', async () => {
      prisma.wards.findMany.mockResolvedValue([wardA]);
      await service.findAllWards(undefined, orgAUser);
      const call = prisma.wards.findMany.mock.calls[0][0];
      expect(call.where.client_org_id).toBe('org-a');
    });

    it('lets a platform operator see everything (no client_org_id filter)', async () => {
      prisma.wards.findMany.mockResolvedValue([]);
      await service.findAllWards(undefined, platformUser);
      const call = prisma.wards.findMany.mock.calls[0][0];
      expect(call.where.client_org_id).toBeUndefined();
    });

    it('computes bed counts from the included beds', async () => {
      prisma.wards.findMany.mockResolvedValue([
        { ...wardA, beds: [{ status: 'occupied' }, { status: 'occupied' }, { status: 'available' }] },
      ]);
      const result = await service.findAllWards(undefined, orgAUser);
      expect(result[0]!.total_beds).toBe(3);
      expect(result[0]!.occupied_beds).toBe(2);
      expect(result[0]!.available_beds).toBe(1);
    });
  });

  describe('findOneWard', () => {
    it('throws NotFoundException for a missing ward', async () => {
      prisma.wards.findUnique.mockResolvedValue(null);
      await expect(service.findOneWard('missing', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects a cross-org read', async () => {
      prisma.wards.findUnique.mockResolvedValue(wardA);
      await expect(service.findOneWard('ward-a', orgBUser)).rejects.toThrow();
    });
  });

  describe('createWard', () => {
    it('rejects a clinic from a different org', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      await expect(
        service.createWard({ name: 'X', clinic_id: 'clinic-a' } as any, orgBUser),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.wards.create).not.toHaveBeenCalled();
    });

    it('derives client_org_id from the validated clinic, not orgIdForWrite', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.wards.create.mockResolvedValue(wardA);
      // A platform operator (client_org_id null) creating a ward for org A's
      // clinic must stamp org A's id, never their own (null/undefined) --
      // the live-reproduced departments.service.ts bug this mirrors.
      await service.createWard({ name: 'Ward A', clinic_id: 'clinic-a' } as any, platformUser);
      expect(prisma.wards.create.mock.calls[0][0].data.client_org_id).toBe('org-a');
    });

    it('validates a cross-org bed_charge_product_id', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.products.findUnique.mockResolvedValue({ id: 'p1', is_deleted: false, client_org_id: 'org-b', clinic: null });
      await expect(
        service.createWard({ name: 'X', clinic_id: 'clinic-a', bed_charge_product_id: 'p1' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts an org-level master product (clinic_id null) for the bed charge', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.products.findUnique.mockResolvedValue(productA);
      prisma.wards.create.mockResolvedValue(wardA);
      await expect(
        service.createWard({ name: 'X', clinic_id: 'clinic-a', bed_charge_product_id: 'product-a' } as any, orgAUser),
      ).resolves.toBeTruthy();
    });
  });

  describe('removeWard', () => {
    it('refuses to delete a ward with occupied or reserved beds', async () => {
      prisma.wards.findUnique.mockResolvedValue(wardA);
      prisma.beds.count.mockResolvedValue(2);
      const result = await service.removeWard('ward-a', orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.wards.update).not.toHaveBeenCalled();
    });

    it('soft-deletes the ward and its beds when none are occupied', async () => {
      prisma.wards.findUnique.mockResolvedValue(wardA);
      prisma.beds.count.mockResolvedValue(0);
      const result = await service.removeWard('ward-a', orgAUser);
      expect(result.success).toBe(true);
      expect(prisma.beds.updateMany).toHaveBeenCalledWith({ where: { ward_id: 'ward-a' }, data: { is_deleted: true } });
    });
  });

  describe('createBed', () => {
    it('rejects a duplicate bed_number within the same ward', async () => {
      prisma.wards.findUnique.mockResolvedValue(wardA);
      prisma.beds.findFirst.mockResolvedValue(bedA);
      await expect(
        service.createBed({ ward_id: 'ward-a', bed_number: 'A-01' } as any, orgAUser),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects a ward from a different org', async () => {
      prisma.wards.findUnique.mockResolvedValue(wardA);
      await expect(
        service.createBed({ ward_id: 'ward-a', bed_number: 'A-02' } as any, orgBUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeBed', () => {
    it('refuses to delete an occupied bed', async () => {
      prisma.beds.findUnique.mockResolvedValue({ ...bedA, status: 'occupied' });
      const result = await service.removeBed('bed-a', orgAUser);
      expect(result.success).toBe(false);
    });
  });

  describe('blockBed', () => {
    it('refuses to block a bed with a patient in it', async () => {
      prisma.beds.findUnique.mockResolvedValue({ ...bedA, status: 'occupied' });
      await expect(
        service.blockBed({ bed_id: 'bed-a', reason: 'AC broken' } as any, orgAUser),
      ).rejects.toThrow(ConflictException);
    });

    it('writes a real BedOccupancies row with no admission and updates the cache', async () => {
      prisma.beds.findUnique.mockResolvedValue(bedA);
      prisma.beds.update.mockResolvedValue({ ...bedA, status: 'blocked' });
      await service.blockBed({ bed_id: 'bed-a', reason: 'AC broken', occupancy_kind: 'blocked' } as any, orgAUser);
      const occCall = prisma.bedOccupancies.create.mock.calls[0][0];
      expect(occCall.data.admission_id).toBeNull();
      expect(occCall.data.occupancy_kind).toBe('blocked');
      expect(prisma.beds.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'blocked' } }));
    });

    it('translates a bed-overlap exclusion violation into a clean conflict message', async () => {
      prisma.beds.findUnique.mockResolvedValue(bedA);
      prisma.bedOccupancies.create.mockRejectedValue(
        new Error('conflicting key value violates exclusion constraint "bed_occupancies_no_double_occupancy"'),
      );
      await expect(
        service.blockBed({ bed_id: 'bed-a', reason: 'x' } as any, orgAUser),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('releaseBed', () => {
    it('refuses to release an occupied bed', async () => {
      prisma.beds.findUnique.mockResolvedValue({ ...bedA, status: 'occupied' });
      await expect(service.releaseBed('bed-a', orgAUser)).rejects.toThrow(ConflictException);
    });

    it('closes the open hold and sets the bed available', async () => {
      prisma.beds.findUnique.mockResolvedValue({ ...bedA, status: 'blocked' });
      prisma.beds.update.mockResolvedValue({ ...bedA, status: 'available' });
      await service.releaseBed('bed-a', orgAUser);
      expect(prisma.bedOccupancies.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { bed_id: 'bed-a', end_at: null, is_cancelled: false, admission_id: null } }),
      );
      expect(prisma.beds.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'available' } }));
    });
  });
});
