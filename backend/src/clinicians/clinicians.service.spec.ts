import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CliniciansService } from './clinicians.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Security regression coverage: create() previously never validated the
// target clinic against the caller's org -- only update() did (via
// findOne()'s existing-record lookup). A manager could create a clinician
// record attributed to a DIFFERENT organization's clinic.
describe('CliniciansService — create-path org scoping', () => {
  let service: CliniciansService;
  let prisma: {
    clinics: { findUnique: jest.Mock };
    clinicians: { findUnique: jest.Mock };
    clinicianTypeModel: { findUnique: jest.Mock; findFirst: jest.Mock };
    languages: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  const managerSameOrg: JwtPayload = { sub: 'u-1', roles: ['manager'], client_org_id: 'org-1' } as JwtPayload;
  const orgLessAdmin: JwtPayload = { sub: 'u-2', roles: ['admin'], client_org_id: null } as JwtPayload;

  const baseInput = { first_name: 'A', last_name: 'B', email: 'a@b.com', clinic_ids: ['clinic-1'] };

  beforeEach(async () => {
    prisma = {
      clinics: { findUnique: jest.fn() },
      clinicians: { findUnique: jest.fn().mockResolvedValue({ id: 'cln-new', first_name: 'A', last_name: 'B', clinic: { client_org_id: 'org-1' } }) },
      clinicianTypeModel: { findUnique: jest.fn(), findFirst: jest.fn() },
      languages: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (fn) => fn({
        clinicians: { create: jest.fn().mockResolvedValue({ id: 'cln-new' }) },
        clinicianLanguages: { createMany: jest.fn() },
        clinicianServices: { createMany: jest.fn() },
      })),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [CliniciansService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(CliniciansService);
  });

  it('rejects creating a clinician for a clinic in a different org', async () => {
    prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-2' });
    await expect(service.create(baseInput as any, managerSameOrg)).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('allows creating a clinician for a clinic in the caller\'s own org', async () => {
    prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
    await expect(service.create(baseInput as any, managerSameOrg)).resolves.toBeDefined();
  });

  it('an org-less platform caller (admin) can create against any org\'s clinic', async () => {
    prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-2' });
    await expect(service.create(baseInput as any, orgLessAdmin)).resolves.toBeDefined();
  });

  // F-01 fix: create() now always validates the target clinic exists (a
  // strict improvement — previously an admin's create() never checked this
  // at all, so a bad clinic_id would only surface as a raw FK-constraint
  // error from Prisma, not a clean BadRequestException).
  it('rejects creating against a nonexistent clinic even for a platform caller', async () => {
    prisma.clinics.findUnique.mockResolvedValue(null);
    await expect(service.create(baseInput as any, orgLessAdmin)).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('CliniciansService — read/write tenant isolation (F-01)', () => {
  let service: CliniciansService;
  let prisma: {
    clinicians: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a' } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u2', roles: ['admin'], client_org_id: null } as JwtPayload;
  // Org-less but NOT a platform role — the self-registered-account shape
  // that made "org-less caller sees everything" exploitable.
  const selfRegisteredPatient: JwtPayload = { sub: 'u3', roles: ['patient'], client_org_id: null } as JwtPayload;

  const clinicianA = {
    id: 'cln-a1', first_name: 'A', last_name: 'B', is_deleted: false,
    clinic: { id: 'clinic-a', client_org_id: 'org-a' },
    clinicianLanguages: [], clinicianServices: [], clinician_type: null, consultation_fee: null,
  };
  const clinicianB = { ...clinicianA, id: 'cln-b1', clinic: { id: 'clinic-b', client_org_id: 'org-b' } };
  const orgLessClinician = { ...clinicianA, id: 'cln-none', clinic: null };

  beforeEach(async () => {
    prisma = {
      clinicians: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [CliniciansService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(CliniciansService);
  });

  describe('findAll', () => {
    it('scopes to the caller org via the clinic relation', async () => {
      await service.findAll(undefined, undefined, 20, 1, orgAUser);
      const where = prisma.clinicians.findMany.mock.calls[0][0].where;
      expect(where.clinic).toEqual({ client_org_id: 'org-a' });
    });

    it('does not scope by org for a platform-wide caller', async () => {
      await service.findAll(undefined, undefined, 20, 1, platformUser);
      const where = prisma.clinicians.findMany.mock.calls[0][0].where;
      expect(where.clinic).toBeUndefined();
    });

    // The actual live-exploited bug: before the fix, `clinic: user.client_org_id
    // ? {...} : undefined` gave an org-less non-operator the SAME "no filter"
    // shape as a platform operator — a self-registered account read the
    // full clinician roster across every tenant.
    it('does NOT fall through to seeing every org for an org-less non-operator (F-01)', async () => {
      await service.findAll(undefined, undefined, 20, 1, selfRegisteredPatient);
      const where = prisma.clinicians.findMany.mock.calls[0][0].where;
      expect(where.clinic).toBeDefined();
      expect(where.clinic.client_org_id).toBeTruthy();
      expect(where.clinic.client_org_id).not.toBe('org-a');
    });
  });

  describe('findOne', () => {
    it('returns a same-org clinician', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianA);
      await expect(service.findOne('cln-a1', orgAUser)).resolves.toMatchObject({ id: 'cln-a1' });
    });

    it('rejects a cross-org clinician', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianB);
      await expect(service.findOne('cln-b1', orgAUser)).rejects.toThrow('Clinician not found');
    });

    it('a platform-wide caller can read any org\'s clinician', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianB);
      await expect(service.findOne('cln-b1', platformUser)).resolves.toMatchObject({ id: 'cln-b1' });
    });

    // F-01 regression test, single-record path: the old
    // `user.client_org_id && ... !== user.client_org_id` check only threw
    // when the CALLER had a real org — an org-less non-operator caller fell
    // through and could read any clinician by id, including a clinic-less one.
    it('rejects an org-less non-operator reading ANY clinician by id (F-01)', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianA);
      await expect(service.findOne('cln-a1', selfRegisteredPatient)).rejects.toThrow('Clinician not found');
      prisma.clinicians.findUnique.mockResolvedValue(orgLessClinician);
      await expect(service.findOne('cln-none', selfRegisteredPatient)).rejects.toThrow('Clinician not found');
    });
  });

  describe('toggleActive', () => {
    it('toggles is_active for a same-org clinician', async () => {
      prisma.clinicians.findUnique.mockResolvedValue({ ...clinicianA, is_active: true });
      prisma.clinicians.update.mockResolvedValue({ ...clinicianA, is_active: false });
      await service.toggleActive('cln-a1', orgAUser);
      expect(prisma.clinicians.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cln-a1' }, data: { is_active: false } }),
      );
    });

    it('rejects toggling a cross-org clinician without ever calling update', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianB);
      await expect(service.toggleActive('cln-b1', orgAUser)).rejects.toThrow('Clinician not found');
      expect(prisma.clinicians.update).not.toHaveBeenCalled();
    });

    it('rejects an org-less non-operator toggling ANY clinician (F-01)', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianA);
      await expect(service.toggleActive('cln-a1', selfRegisteredPatient)).rejects.toThrow('Clinician not found');
      expect(prisma.clinicians.update).not.toHaveBeenCalled();
    });
  });
});
