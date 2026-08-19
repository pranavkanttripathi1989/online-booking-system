import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ServicesService } from './services.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: {
    products: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u2', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const scopedService = {
    id: 'svc-a1',
    name: 'Consultation',
    clinic_id: 'clinic-a',
    price: 150000,
    is_deleted: false,
    category: null,
    clinicianServices: [{ clinician: { id: 'cl-1', first_name: 'Dr', last_name: 'Rao' } }],
    clinic: { id: 'clinic-a', client_org_id: 'org-a' },
  };
  const otherOrgService = { ...scopedService, id: 'svc-b1', clinic_id: 'clinic-b', clinic: { id: 'clinic-b', client_org_id: 'org-b' } };
  const clinicLessService = { ...scopedService, id: 'svc-none', clinic_id: null, clinic: null };

  beforeEach(async () => {
    prisma = { products: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServicesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ServicesService);
  });

  describe('findAll — tenant isolation + shaping', () => {
    it('scopes to the caller org via the clinic relation', async () => {
      prisma.products.findMany.mockResolvedValue([]);
      await service.findAll(undefined, undefined, orgAUser);
      expect(prisma.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinic: { client_org_id: 'org-a' } }) }),
      );
    });

    it('does not scope by org for a platform-wide caller', async () => {
      prisma.products.findMany.mockResolvedValue([]);
      await service.findAll(undefined, undefined, platformUser);
      expect(prisma.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinic: undefined }) }),
      );
    });

    it('applies clinicId and is_active filters additively', async () => {
      prisma.products.findMany.mockResolvedValue([]);
      await service.findAll('clinic-a', true, orgAUser);
      expect(prisma.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinic_id: 'clinic-a', is_active: true }) }),
      );
    });

    it('converts price to rupees and flattens clinicianServices into a clinicians list', async () => {
      prisma.products.findMany.mockResolvedValue([scopedService]);
      const [result] = await service.findAll(undefined, undefined, orgAUser);
      expect(result.price).toBe(1500);
      expect(result.clinicians).toEqual([{ id: 'cl-1', first_name: 'Dr', last_name: 'Rao' }]);
    });
  });

  describe('findOne — tenant isolation when a clinic IS attached', () => {
    it('returns a same-org service', async () => {
      prisma.products.findUnique.mockResolvedValue(scopedService);
      const result = await service.findOne('svc-a1', orgAUser);
      expect(result.id).toBe('svc-a1');
    });

    it('rejects a cross-org service with NotFoundException', async () => {
      prisma.products.findUnique.mockResolvedValue(otherOrgService);
      await expect(service.findOne('svc-b1', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects a soft-deleted service', async () => {
      prisma.products.findUnique.mockResolvedValue({ ...scopedService, is_deleted: true });
      await expect(service.findOne('svc-a1', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects when the service does not exist', async () => {
      prisma.products.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing', orgAUser)).rejects.toThrow(NotFoundException);
    });

    // Known gap shared with the products domain — see context/open-questions.md
    // #2's addendum: create() never attaches a clinic_id (ServiceInput has no
    // such field), so the tenant check is a no-op for services created via the
    // live UI. Documents actual current behavior, not the intended behavior.
    it('KNOWN GAP: does not reject a cross-org read of a clinic-less service', async () => {
      prisma.products.findUnique.mockResolvedValue(clinicLessService);
      await expect(service.findOne('svc-none', orgAUser)).resolves.toMatchObject({ id: 'svc-none' });
    });
  });

  describe('create', () => {
    it('auto-generates a SKU and hardcodes product_type to simple (ServiceInput has neither field)', async () => {
      prisma.products.create.mockResolvedValue({ id: 'svc-new', clinicianServices: [] });
      await service.create({ name: 'Blood Test', duration_minutes: 30, price: 500 } as any);
      const call = prisma.products.create.mock.calls[0][0];
      expect(call.data.sku).toMatch(/^blood-test-/);
      expect(call.data.product_type).toBe('simple');
    });

    it('converts price from rupees to paise and passes duration_minutes through', async () => {
      prisma.products.create.mockResolvedValue({ id: 'svc-new', clinicianServices: [] });
      await service.create({ name: 'X', duration_minutes: 20, price: 300 } as any);
      expect(prisma.products.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ price: 30000, duration_minutes: 20 }) }),
      );
    });
  });

  describe('update — tenant isolation enforced via findOne before any write', () => {
    it('updates a same-org service', async () => {
      prisma.products.findUnique.mockResolvedValue(scopedService);
      prisma.products.update.mockResolvedValue({ ...scopedService, name: 'Renamed', clinicianServices: [] });
      const result = await service.update('svc-a1', { name: 'Renamed' } as any, orgAUser);
      expect(result.name).toBe('Renamed');
    });

    it('rejects a cross-org update without ever calling prisma.update', async () => {
      prisma.products.findUnique.mockResolvedValue(otherOrgService);
      await expect(service.update('svc-b1', { name: 'Hijack' } as any, orgAUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.products.update).not.toHaveBeenCalled();
    });
  });
});
