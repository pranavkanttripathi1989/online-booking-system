import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClinicsService } from './clinics.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('ClinicsService', () => {
  let service: ClinicsService;
  let prisma: {
    clinics: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const orgAClinic = { id: 'clinic-a1', client_org_id: 'org-a', is_deleted: false, name: 'A Clinic' };
  const orgBClinic = { id: 'clinic-b1', client_org_id: 'org-b', is_deleted: false, name: 'B Clinic' };

  const orgAUser: JwtPayload = {
    sub: 'user-1',
    roles: ['manager'],
    client_org_id: 'org-a',
    patient_id: null,
    clinician_id: null,
  } as JwtPayload;

  const platformUser: JwtPayload = {
    sub: 'user-admin',
    roles: ['admin'],
    client_org_id: null,
    patient_id: null,
    clinician_id: null,
  } as JwtPayload;

  // F-01 (project-plans/02-findings-register.md): the exact shape a
  // self-registered account has — org-less, but NOT a platform role. This is
  // the account type that made "org-less caller sees everything" exploitable.
  const selfRegisteredPatient: JwtPayload = {
    sub: 'user-patient',
    roles: ['patient'],
    client_org_id: null,
    patient_id: null,
    clinician_id: null,
  } as JwtPayload;

  beforeEach(async () => {
    prisma = {
      clinics: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClinicsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ClinicsService);
  });

  describe('findAll — tenant isolation', () => {
    it('scopes to the caller org for an org-linked user', async () => {
      prisma.clinics.findMany.mockResolvedValue([orgAClinic]);
      await service.findAll(orgAUser);
      expect(prisma.clinics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { is_deleted: false, client_org_id: 'org-a' },
        }),
      );
    });

    it('does not scope by org for an org-less platform user (sees everything)', async () => {
      prisma.clinics.findMany.mockResolvedValue([orgAClinic, orgBClinic]);
      await service.findAll(platformUser);
      expect(prisma.clinics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { is_deleted: false } }),
      );
    });

    // F-01 regression test — this is the actual live-exploited bug. Before
    // the fix, an org-less NON-operator (a self-registered patient) fell into
    // the same "no filter at all" branch as a platform operator, because the
    // old code only asked "does this caller have an org", never "is this
    // caller allowed to see every org". Confirmed live: a fresh
    // self-registered account read every tenant's clinics.
    it('does NOT fall through to seeing everything for an org-less non-operator (F-01)', async () => {
      prisma.clinics.findMany.mockResolvedValue([]);
      await service.findAll(selfRegisteredPatient);
      const where = prisma.clinics.findMany.mock.calls[0][0].where;
      expect(where).not.toEqual({ is_deleted: false }); // must not be the platform-operator shape
      expect(where.client_org_id).toBeTruthy();
      expect(where.client_org_id).not.toBe('org-a');
      expect(where.client_org_id).not.toBe('org-b');
    });

    it('passes an explicit limit through to take', async () => {
      prisma.clinics.findMany.mockResolvedValue([]);
      await service.findAll(orgAUser, 5);
      expect(prisma.clinics.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    });
  });

  describe('findOne — tenant isolation (TC-CLI-API equivalent of TC-PAT-API-006)', () => {
    it('returns the clinic when it belongs to the caller org', async () => {
      prisma.clinics.findUnique.mockResolvedValue(orgAClinic);
      const result = await service.findOne('clinic-a1', orgAUser);
      expect(result).toEqual(orgAClinic);
    });

    it('rejects a cross-tenant read with NotFoundException, not the raw record', async () => {
      prisma.clinics.findUnique.mockResolvedValue(orgBClinic);
      await expect(service.findOne('clinic-b1', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects when the clinic does not exist', async () => {
      prisma.clinics.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects a soft-deleted clinic even within the same org', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ ...orgAClinic, is_deleted: true });
      await expect(service.findOne('clinic-a1', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('allows an org-less platform user to read any org clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue(orgBClinic);
      const result = await service.findOne('clinic-b1', platformUser);
      expect(result).toEqual(orgBClinic);
    });

    // F-01 regression test, single-record path: the old
    // `user.client_org_id && clinic.client_org_id !== user.client_org_id`
    // check only threw when the CALLER had a real org — an org-less
    // non-operator caller fell through and could read any clinic by id.
    it('rejects an org-less non-operator reading ANY clinic by id (F-01)', async () => {
      prisma.clinics.findUnique.mockResolvedValue(orgAClinic);
      await expect(service.findOne('clinic-a1', selfRegisteredPatient)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create — org comes from the JWT, never client input', () => {
    it('stamps client_org_id from the caller, ignoring any org-shaped fields on input', async () => {
      prisma.clinics.create.mockResolvedValue({ id: 'new-clinic', client_org_id: 'org-a' });
      await service.create({ name: 'New', address: '1 Main St', phone: '123', email: 'a@b.com' } as any, orgAUser);
      expect(prisma.clinics.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ client_org_id: 'org-a' }),
      });
    });

    it('stamps a null client_org_id for a platform-wide caller', async () => {
      prisma.clinics.create.mockResolvedValue({ id: 'new-clinic', client_org_id: null });
      await service.create({ name: 'New', address: '1 Main St', phone: '123', email: 'a@b.com' } as any, platformUser);
      expect(prisma.clinics.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ client_org_id: null }),
      });
    });

    // REQ101
    it('persists state/gstin when supplied', async () => {
      prisma.clinics.create.mockResolvedValue({ id: 'new-clinic', client_org_id: 'org-a' });
      await service.create({ name: 'New', address: '1 Main St', phone: '123', email: 'a@b.com', state: 'Maharashtra', gstin: '27ABCDE1234F1Z5' } as any, orgAUser);
      expect(prisma.clinics.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ state: 'Maharashtra', gstin: '27ABCDE1234F1Z5' }),
      });
    });
  });

  describe('update — tenant isolation enforced via findOne before any write', () => {
    it('updates a clinic that belongs to the caller org', async () => {
      prisma.clinics.findUnique.mockResolvedValue(orgAClinic);
      prisma.clinics.update.mockResolvedValue({ ...orgAClinic, name: 'Renamed' });
      const result = await service.update('clinic-a1', { name: 'Renamed' } as any, orgAUser);
      expect(prisma.clinics.update).toHaveBeenCalledWith({
        where: { id: 'clinic-a1' },
        data: { name: 'Renamed' },
      });
      expect(result.name).toBe('Renamed');
    });

    it('rejects a cross-tenant update without ever calling prisma.update', async () => {
      prisma.clinics.findUnique.mockResolvedValue(orgBClinic);
      await expect(service.update('clinic-b1', { name: 'Hijacked' } as any, orgAUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.clinics.update).not.toHaveBeenCalled();
    });
  });

  describe('setHeadOffice (REQ041)', () => {
    it('unsets any other primary clinic in the same org before setting the new one', async () => {
      prisma.clinics.findUnique.mockResolvedValue(orgAClinic);
      prisma.clinics.update.mockResolvedValue({ ...orgAClinic, is_primary: true });
      await service.setHeadOffice('clinic-a1', orgAUser);
      expect(prisma.clinics.updateMany).toHaveBeenCalledWith({
        where: { client_org_id: 'org-a', is_primary: true },
        data: { is_primary: false },
      });
      expect(prisma.clinics.update).toHaveBeenCalledWith({
        where: { id: 'clinic-a1' },
        data: { is_primary: true },
      });
    });

    it('skips the unset step for an org-less clinic -- each is its own unscoped case, not one shared slot', async () => {
      const orgLessClinic = { id: 'clinic-x1', client_org_id: null, is_deleted: false, name: 'Legacy Clinic' };
      prisma.clinics.findUnique.mockResolvedValue(orgLessClinic);
      prisma.clinics.update.mockResolvedValue({ ...orgLessClinic, is_primary: true });
      await service.setHeadOffice('clinic-x1', platformUser);
      expect(prisma.clinics.updateMany).not.toHaveBeenCalled();
      expect(prisma.clinics.update).toHaveBeenCalledWith({
        where: { id: 'clinic-x1' },
        data: { is_primary: true },
      });
    });

    it('rejects a cross-tenant caller without ever calling update or updateMany', async () => {
      prisma.clinics.findUnique.mockResolvedValue(orgBClinic);
      await expect(service.setHeadOffice('clinic-b1', orgAUser)).rejects.toThrow(NotFoundException);
      expect(prisma.clinics.update).not.toHaveBeenCalled();
      expect(prisma.clinics.updateMany).not.toHaveBeenCalled();
    });
  });
});
