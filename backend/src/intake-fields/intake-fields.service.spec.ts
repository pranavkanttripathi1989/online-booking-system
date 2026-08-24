import { Test, TestingModule } from '@nestjs/testing';
import { IntakeFieldsService } from './intake-fields.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('IntakeFieldsService', () => {
  let service: IntakeFieldsService;
  let prisma: any;

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a' } as JwtPayload;
  const orgBUser: JwtPayload = { sub: 'u2', roles: ['manager'], client_org_id: 'org-b' } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u3', roles: ['admin'], client_org_id: null } as JwtPayload;

  const clinicA = { id: 'clinic-a', client_org_id: 'org-a', is_deleted: false };
  const clinicB = { id: 'clinic-b', client_org_id: 'org-b', is_deleted: false };

  const fieldA = {
    id: 'field-a1', clinic_id: 'clinic-a', product_id: null, key: 'current_medications',
    label: 'Current medications', field_type: 'textarea', is_required: false, sort_order: 0,
    is_deleted: false, clinic: clinicA,
  };
  const fieldB = { ...fieldA, id: 'field-b1', clinic_id: 'clinic-b', clinic: clinicB };

  beforeEach(async () => {
    prisma = {
      clinicIntakeFieldConfig: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      clinics: { findUnique: jest.fn() },
      products: { findUnique: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [IntakeFieldsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(IntakeFieldsService);
  });

  describe('list', () => {
    it('returns fields for a clinic in the caller\'s own org', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.clinicIntakeFieldConfig.findMany.mockResolvedValue([fieldA]);
      const result = await service.list('clinic-a', undefined, orgAUser);
      expect(result).toHaveLength(1);
    });

    it('returns empty for a cross-org clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      const result = await service.list('clinic-b', undefined, orgAUser);
      expect(result).toEqual([]);
      expect(prisma.clinicIntakeFieldConfig.findMany).not.toHaveBeenCalled();
    });

    it('with no clinic_id, scopes to the caller\'s own org only', async () => {
      prisma.clinicIntakeFieldConfig.findMany.mockResolvedValue([fieldB]);
      const result = await service.list(undefined, undefined, orgBUser);
      expect(result).toHaveLength(1);
      expect(prisma.clinicIntakeFieldConfig.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ clinic: { client_org_id: 'org-b' } }),
      }));
    });

    it('a platform operator can list any clinic\'s fields', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      prisma.clinicIntakeFieldConfig.findMany.mockResolvedValue([fieldB]);
      const result = await service.list('clinic-b', undefined, platformUser);
      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('creates a field for a clinic in scope', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.clinicIntakeFieldConfig.create.mockResolvedValue(fieldA);
      const result = await service.create({ clinic_id: 'clinic-a', key: 'current_medications', label: 'Current medications' }, orgAUser);
      expect(result.success).toBe(true);
    });

    it('rejects creating a field for a cross-org clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      const result = await service.create({ clinic_id: 'clinic-b', key: 'x', label: 'x' }, orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.clinicIntakeFieldConfig.create).not.toHaveBeenCalled();
    });

    it('rejects a product_id that does not belong to the given clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.products.findUnique.mockResolvedValue({ id: 'prod-1', clinic_id: 'clinic-b' });
      const result = await service.create({ clinic_id: 'clinic-a', product_id: 'prod-1', key: 'x', label: 'x' }, orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.clinicIntakeFieldConfig.create).not.toHaveBeenCalled();
    });
  });

  describe('update / remove', () => {
    it('rejects updating a cross-org field', async () => {
      prisma.clinicIntakeFieldConfig.findUnique.mockResolvedValue(fieldB);
      const result = await service.update('field-b1', { label: 'x' }, orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.clinicIntakeFieldConfig.update).not.toHaveBeenCalled();
    });

    it('rejects deleting a cross-org field', async () => {
      prisma.clinicIntakeFieldConfig.findUnique.mockResolvedValue(fieldB);
      const result = await service.remove('field-b1', orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.clinicIntakeFieldConfig.update).not.toHaveBeenCalled();
    });
  });

  describe('forBooking', () => {
    it('returns clinic-wide + product-specific fields only', async () => {
      prisma.clinicIntakeFieldConfig.findMany.mockResolvedValue([fieldA]);
      await service.forBooking('clinic-a', 'prod-1');
      expect(prisma.clinicIntakeFieldConfig.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ clinic_id: 'clinic-a', OR: [{ product_id: null }, { product_id: 'prod-1' }] }),
      }));
    });
  });
});
