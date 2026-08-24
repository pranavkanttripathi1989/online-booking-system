import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ServicesService } from './services.service';
import { PrismaService } from '../prisma/prisma.service';
import { DepartmentsService } from '../departments/departments.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// No fixture below sets department_id, so this mock is never actually
// invoked — present only so Nest's DI can resolve ServicesService's
// constructor.
const departmentsServiceMock = { assertDepartmentInScope: jest.fn() };

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: {
    products: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u2', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;
  // F-01: org-less but NOT a platform role — the self-registered-account shape.
  const selfRegisteredPatient: JwtPayload = { sub: 'u3', roles: ['patient'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const scopedService = {
    id: 'svc-a1',
    name: 'Consultation',
    clinic_id: null,
    client_org_id: 'org-a',
    price: 150000,
    is_deleted: false,
    category: null,
    clinicianServices: [{ clinician: { id: 'cl-1', first_name: 'Dr', last_name: 'Rao' } }],
  };
  const otherOrgService = { ...scopedService, id: 'svc-b1', client_org_id: 'org-b' };
  const orgLessService = { ...scopedService, id: 'svc-none', client_org_id: null };

  beforeEach(async () => {
    prisma = { products: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: DepartmentsService, useValue: departmentsServiceMock },
      ],
    }).compile();
    service = module.get(ServicesService);
  });

  describe('findAll — tenant isolation + shaping', () => {
    it('scopes to the caller org via client_org_id', async () => {
      prisma.products.findMany.mockResolvedValue([]);
      await service.findAll(undefined, undefined, orgAUser);
      expect(prisma.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
    });

    it('does not scope by org for a platform-wide caller', async () => {
      prisma.products.findMany.mockResolvedValue([]);
      await service.findAll(undefined, undefined, platformUser);
      const where = prisma.products.findMany.mock.calls[0][0].where;
      expect(where.client_org_id).toBeUndefined();
    });

    // F-01 regression test: before the fix, `client_org_id: user.client_org_id
    // ?? undefined` was Prisma's "ignore this filter" shape for an org-less
    // caller too, not just for a platform operator — a self-registered
    // account saw every tenant's service catalogue with prices.
    it('does NOT fall through to seeing every org for an org-less non-operator (F-01)', async () => {
      prisma.products.findMany.mockResolvedValue([]);
      await service.findAll(undefined, undefined, selfRegisteredPatient);
      const where = prisma.products.findMany.mock.calls[0][0].where;
      expect(where.client_org_id).toBeTruthy();
      expect(where.client_org_id).not.toBe('org-a');
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
      // ServiceClinicianType.full_name is a computed field (Clinicians has no
      // such column) — assert the real GraphQL shape, not the raw Prisma row,
      // so this test would have caught the "Cannot return null for
      // non-nullable field ServiceClinician.full_name" bug this fixes.
      expect(result.clinicians).toEqual([{ id: 'cl-1', full_name: 'Dr Rao' }]);
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

    // BUG001 — previously a documented KNOWN GAP: the tenant check keyed off
    // the (always-null) clinic relation. Fixed by scoping on the direct
    // client_org_id column stamped at create time.
    it('rejects a cross-org read of an org-less service for a tenant caller (BUG001 fixed)', async () => {
      prisma.products.findUnique.mockResolvedValue(orgLessService);
      await expect(service.findOne('svc-none', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('a platform-wide caller can still read an org-less service', async () => {
      prisma.products.findUnique.mockResolvedValue(orgLessService);
      await expect(service.findOne('svc-none', platformUser)).resolves.toMatchObject({ id: 'svc-none' });
    });

    // F-01 regression test, single-record path: an org-less non-operator
    // must never match anything, including another org-less (legacy) record.
    it('rejects an org-less non-operator reading ANY service, even an org-less one (F-01)', async () => {
      prisma.products.findUnique.mockResolvedValue(scopedService);
      await expect(service.findOne('svc-a1', selfRegisteredPatient)).rejects.toThrow(NotFoundException);
      prisma.products.findUnique.mockResolvedValue(orgLessService);
      await expect(service.findOne('svc-none', selfRegisteredPatient)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('auto-generates a SKU and hardcodes product_type to simple (ServiceInput has neither field)', async () => {
      prisma.products.create.mockResolvedValue({ id: 'svc-new', clinicianServices: [] });
      await service.create({ name: 'Blood Test', duration_minutes: 30, price: 500 } as any, orgAUser);
      const call = prisma.products.create.mock.calls[0][0];
      expect(call.data.sku).toMatch(/^blood-test-/);
      expect(call.data.product_type).toBe('simple');
    });

    it('converts price from rupees to paise and passes duration_minutes through', async () => {
      prisma.products.create.mockResolvedValue({ id: 'svc-new', clinicianServices: [] });
      await service.create({ name: 'X', duration_minutes: 20, price: 300 } as any, orgAUser);
      expect(prisma.products.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ price: 30000, duration_minutes: 20 }) }),
      );
    });

    // BUG001 — the actual fix: create() never stamped any org scope before.
    it('stamps client_org_id from the caller JWT', async () => {
      prisma.products.create.mockResolvedValue({ id: 'svc-new', clinicianServices: [] });
      await service.create({ name: 'X', duration_minutes: 20, price: 300 } as any, orgAUser);
      expect(prisma.products.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
    });

    // REQ046 (US-CAT-06) — a healthcare consultation created through the
    // Services path is GST-exempt by default, the opposite default from
    // ProductsService's retail path (see products.service.spec.ts).
    it('defaults is_tax_exempt to true when not supplied', async () => {
      prisma.products.create.mockResolvedValue({ id: 'svc-new', clinicianServices: [] });
      await service.create({ name: 'General Consultation', duration_minutes: 20, price: 300 } as any, orgAUser);
      expect(prisma.products.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ is_tax_exempt: true }) }),
      );
    });

    it('honours an explicit is_tax_exempt: false override', async () => {
      prisma.products.create.mockResolvedValue({ id: 'svc-new', clinicianServices: [] });
      await service.create({ name: 'X', duration_minutes: 20, price: 300, is_tax_exempt: false, hsn: '9993' } as any, orgAUser);
      expect(prisma.products.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ is_tax_exempt: false, hsn: '9993' }) }),
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
