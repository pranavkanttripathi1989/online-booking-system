import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ014 (US-ORG-03). Departments owns client_org_id directly (same shape
// as ResourcesService) — so scoping/ownership checks compare against the
// department's own column via orgScope()/assertSameOrg(), not orgScopeVia()
// through a relation. The create-path clinic-ownership check (Hard Rule 6)
// mirrors ResourcesService/RoomsService exactly.
describe('DepartmentsService', () => {
  let service: DepartmentsService;
  let prisma: {
    departments: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    clinics: { findUnique: jest.Mock };
  };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u2', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;
  // F-01 shape: org-less but NOT a platform role.
  const selfRegisteredPatient: JwtPayload = { sub: 'u3', roles: ['patient'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const clinicA = { id: 'clinic-a', client_org_id: 'org-a', is_deleted: false };
  const clinicB = { id: 'clinic-b', client_org_id: 'org-b', is_deleted: false };

  const deptA = {
    id: 'dept-a1', name: 'Cardiology',
    client_org_id: 'org-a', clinic_id: 'clinic-a', is_deleted: false, clinic: clinicA,
  };
  const deptB = { ...deptA, id: 'dept-b1', client_org_id: 'org-b', clinic_id: 'clinic-b', clinic: clinicB };

  beforeEach(async () => {
    prisma = {
      departments: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      clinics: { findUnique: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [DepartmentsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(DepartmentsService);
  });

  describe('findAll — tenant isolation', () => {
    it("scopes to the caller org via the department's own client_org_id column", async () => {
      prisma.departments.findMany.mockResolvedValue([]);
      await service.findAll(undefined, orgAUser);
      expect(prisma.departments.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
    });

    it('does not scope by org for a platform-wide caller', async () => {
      prisma.departments.findMany.mockResolvedValue([]);
      await service.findAll(undefined, platformUser);
      expect(prisma.departments.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { is_deleted: false } }),
      );
    });

    // F-01 regression: an org-less non-operator must never see every org's
    // departments — orgScope() falls back to a sentinel that matches nothing.
    it('does NOT fall through to seeing every org for an org-less non-operator (F-01)', async () => {
      prisma.departments.findMany.mockResolvedValue([]);
      await service.findAll(undefined, selfRegisteredPatient);
      const where = prisma.departments.findMany.mock.calls[0][0].where;
      expect(where.client_org_id).toBeTruthy();
      expect(where.client_org_id).not.toBe('org-a');
    });
  });

  describe('findOne — tenant isolation', () => {
    it('rejects a cross-org department with NotFoundException', async () => {
      prisma.departments.findUnique.mockResolvedValue(deptB);
      await expect(service.findOne('dept-b1', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('returns a same-org department', async () => {
      prisma.departments.findUnique.mockResolvedValue(deptA);
      const result = await service.findOne('dept-a1', orgAUser);
      expect(result.id).toBe('dept-a1');
    });
  });

  describe('create — Hard Rule 6: the clinic_id boundary', () => {
    it('rejects when clinic_id is omitted', async () => {
      await expect(service.create({ name: 'Cardiology' } as any, orgAUser)).rejects.toThrow(BadRequestException);
      expect(prisma.departments.create).not.toHaveBeenCalled();
    });

    it('rejects a clinic_id belonging to a different org', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      await expect(
        service.create({ name: 'Cardiology', clinic_id: 'clinic-b' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.departments.create).not.toHaveBeenCalled();
    });

    it('creates and stamps client_org_id from the validated target clinic, not the caller', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.departments.create.mockResolvedValue(deptA);
      await service.create({ name: 'Cardiology', clinic_id: 'clinic-a' } as any, orgAUser);
      expect(prisma.departments.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-a', clinic_id: 'clinic-a' }) }),
      );
    });

    it('rejects an org-less non-operator creating a department at all (assertClinicInScope fails closed)', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      await expect(
        service.create({ name: 'Cardiology', clinic_id: 'clinic-a' } as any, selfRegisteredPatient),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.departments.create).not.toHaveBeenCalled();
    });

    // Live-reproduced bug (see create()'s own comment): a platform operator
    // with NO org of their own used to crash here with a raw Prisma
    // "Argument client_organization is missing" error, because the old code
    // stamped client_org_id from orgIdForWrite(user, ...), which returns
    // undefined for an org-less platform operator against this NOT NULL
    // column. Deriving from the validated clinic instead fixes it.
    it('an org-less platform operator can create a department under any real clinic (no crash)', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      prisma.departments.create.mockResolvedValue(deptB);
      await service.create({ name: 'Cardiology', clinic_id: 'clinic-b' } as any, platformUser);
      expect(prisma.departments.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-b', clinic_id: 'clinic-b' }) }),
      );
    });
  });

  describe('update — tenant isolation on both the existing department and any clinic re-assignment', () => {
    it('rejects a cross-org existing department', async () => {
      prisma.departments.findUnique.mockResolvedValue(deptB);
      await expect(service.update('dept-b1', { name: 'X' } as any, orgAUser)).rejects.toThrow(NotFoundException);
      expect(prisma.departments.update).not.toHaveBeenCalled();
    });

    it('rejects re-assigning to a different-org clinic', async () => {
      prisma.departments.findUnique.mockResolvedValue(deptA);
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      await expect(
        service.update('dept-a1', { name: 'X', clinic_id: 'clinic-b' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.departments.update).not.toHaveBeenCalled();
    });

    it('updates a same-org department', async () => {
      prisma.departments.findUnique.mockResolvedValue(deptA);
      prisma.departments.update.mockResolvedValue({ ...deptA, name: 'Renamed' });
      const result = await service.update('dept-a1', { name: 'Renamed' } as any, orgAUser);
      expect(result.name).toBe('Renamed');
    });
  });

  describe('remove — tenant isolation (returns a result object, not a throw)', () => {
    it('returns {success:false} for a cross-org department without ever calling update', async () => {
      prisma.departments.findUnique.mockResolvedValue(deptB);
      const result = await service.remove('dept-b1', orgAUser);
      expect(result).toEqual({ success: false, userErrors: [{ message: 'Department not found' }] });
      expect(prisma.departments.update).not.toHaveBeenCalled();
    });

    it('soft-deletes a same-org department', async () => {
      prisma.departments.findUnique.mockResolvedValue(deptA);
      prisma.departments.update.mockResolvedValue({ ...deptA, is_deleted: true });
      const result = await service.remove('dept-a1', orgAUser);
      expect(prisma.departments.update).toHaveBeenCalledWith({ where: { id: 'dept-a1' }, data: { is_deleted: true } });
      expect(result).toEqual({ success: true, userErrors: [] });
    });
  });

  describe('assertDepartmentInScope — reused by clinicians/services create+update', () => {
    it('rejects a cross-org department id', async () => {
      prisma.departments.findUnique.mockResolvedValue(deptB);
      await expect(service.assertDepartmentInScope('dept-b1', orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects a soft-deleted department id', async () => {
      prisma.departments.findUnique.mockResolvedValue({ ...deptA, is_deleted: true });
      await expect(service.assertDepartmentInScope('dept-a1', orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('returns the department row for a same-org id', async () => {
      prisma.departments.findUnique.mockResolvedValue(deptA);
      const result = await service.assertDepartmentInScope('dept-a1', orgAUser);
      expect(result.id).toBe('dept-a1');
    });
  });
});
