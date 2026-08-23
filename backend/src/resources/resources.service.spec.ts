import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ017 US-CAL-05. Unlike RoomsService (scoped only via its clinic
// relation), Resources owns client_org_id directly — so scoping/ownership
// checks compare against the resource's own column via orgScope()/
// assertSameOrg(), not orgScopeVia() through a relation. The create-path
// clinic-ownership check (Hard Rule 6) still applies identically to Rooms.
describe('ResourcesService', () => {
  let service: ResourcesService;
  let prisma: {
    resources: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    clinics: { findUnique: jest.Mock };
  };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u2', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;
  // F-01 shape: org-less but NOT a platform role.
  const selfRegisteredPatient: JwtPayload = { sub: 'u3', roles: ['patient'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const clinicA = { id: 'clinic-a', client_org_id: 'org-a', is_deleted: false };
  const clinicB = { id: 'clinic-b', client_org_id: 'org-b', is_deleted: false };

  const resourceA = {
    id: 'res-a1', name: 'ECG Machine', type: 'equipment', is_bookable: true,
    client_org_id: 'org-a', clinic_id: 'clinic-a', is_deleted: false, clinic: clinicA,
  };
  const resourceB = { ...resourceA, id: 'res-b1', client_org_id: 'org-b', clinic_id: 'clinic-b', clinic: clinicB };

  beforeEach(async () => {
    prisma = {
      resources: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      clinics: { findUnique: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResourcesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ResourcesService);
  });

  describe('findAll — tenant isolation', () => {
    it('scopes to the caller org via the resource\'s own client_org_id column', async () => {
      prisma.resources.findMany.mockResolvedValue([]);
      await service.findAll(undefined, orgAUser);
      expect(prisma.resources.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
    });

    it('does not scope by org for a platform-wide caller', async () => {
      prisma.resources.findMany.mockResolvedValue([]);
      await service.findAll(undefined, platformUser);
      expect(prisma.resources.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { is_deleted: false } }),
      );
    });

    // F-01 regression: an org-less non-operator must never see every org's
    // resources — orgScope() falls back to a sentinel that matches nothing.
    it('does NOT fall through to seeing every org for an org-less non-operator (F-01)', async () => {
      prisma.resources.findMany.mockResolvedValue([]);
      await service.findAll(undefined, selfRegisteredPatient);
      const where = prisma.resources.findMany.mock.calls[0][0].where;
      expect(where.client_org_id).toBeTruthy();
      expect(where.client_org_id).not.toBe('org-a');
    });
  });

  describe('findOne — tenant isolation', () => {
    it('rejects a cross-org resource with NotFoundException', async () => {
      prisma.resources.findUnique.mockResolvedValue(resourceB);
      await expect(service.findOne('res-b1', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('returns a same-org resource', async () => {
      prisma.resources.findUnique.mockResolvedValue(resourceA);
      const result = await service.findOne('res-a1', orgAUser);
      expect(result.id).toBe('res-a1');
    });
  });

  describe('create — Hard Rule 6: the clinic_id boundary', () => {
    it('rejects when clinic_id is omitted', async () => {
      await expect(service.create({ name: 'ECG' } as any, orgAUser)).rejects.toThrow(BadRequestException);
      expect(prisma.resources.create).not.toHaveBeenCalled();
    });

    it('rejects a clinic_id belonging to a different org', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      await expect(
        service.create({ name: 'ECG', clinic_id: 'clinic-b' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.resources.create).not.toHaveBeenCalled();
    });

    it('creates and stamps client_org_id from the caller, not the input', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.resources.create.mockResolvedValue(resourceA);
      await service.create({ name: 'ECG Machine', clinic_id: 'clinic-a' } as any, orgAUser);
      expect(prisma.resources.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-a', clinic_id: 'clinic-a' }) }),
      );
    });

    it('rejects an org-less non-operator creating a resource at all (orgIdForWrite fails closed)', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      await expect(
        service.create({ name: 'ECG', clinic_id: 'clinic-a' } as any, selfRegisteredPatient),
      ).rejects.toThrow();
      expect(prisma.resources.create).not.toHaveBeenCalled();
    });
  });

  describe('update — tenant isolation on both the existing resource and any clinic re-assignment', () => {
    it('rejects a cross-org existing resource', async () => {
      prisma.resources.findUnique.mockResolvedValue(resourceB);
      await expect(service.update('res-b1', { name: 'X' } as any, orgAUser)).rejects.toThrow(NotFoundException);
      expect(prisma.resources.update).not.toHaveBeenCalled();
    });

    it('rejects re-assigning to a different-org clinic', async () => {
      prisma.resources.findUnique.mockResolvedValue(resourceA);
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      await expect(
        service.update('res-a1', { name: 'X', clinic_id: 'clinic-b' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.resources.update).not.toHaveBeenCalled();
    });

    it('updates a same-org resource', async () => {
      prisma.resources.findUnique.mockResolvedValue(resourceA);
      prisma.resources.update.mockResolvedValue({ ...resourceA, name: 'Renamed' });
      const result = await service.update('res-a1', { name: 'Renamed' } as any, orgAUser);
      expect(result.name).toBe('Renamed');
    });
  });

  describe('remove — tenant isolation (returns a result object, not a throw)', () => {
    it('returns {success:false} for a cross-org resource without ever calling update', async () => {
      prisma.resources.findUnique.mockResolvedValue(resourceB);
      const result = await service.remove('res-b1', orgAUser);
      expect(result).toEqual({ success: false, userErrors: [{ message: 'Resource not found' }] });
      expect(prisma.resources.update).not.toHaveBeenCalled();
    });

    it('soft-deletes a same-org resource', async () => {
      prisma.resources.findUnique.mockResolvedValue(resourceA);
      prisma.resources.update.mockResolvedValue({ ...resourceA, is_deleted: true });
      const result = await service.remove('res-a1', orgAUser);
      expect(prisma.resources.update).toHaveBeenCalledWith({ where: { id: 'res-a1' }, data: { is_deleted: true } });
      expect(result).toEqual({ success: true, userErrors: [] });
    });
  });
});
