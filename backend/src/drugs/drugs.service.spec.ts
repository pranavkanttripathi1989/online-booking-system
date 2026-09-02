import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DrugsService } from './drugs.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('DrugsService (REQ044)', () => {
  let service: DrugsService;
  let prisma: {
    drugs: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    clinicianFavouriteDrugs: { findMany: jest.Mock; upsert: jest.Mock; deleteMany: jest.Mock };
  };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u3', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;
  // REQ173
  const clinicianUser: JwtPayload = { sub: 'u4', roles: ['clinician'], client_org_id: 'org-a', patient_id: null, clinician_id: 'clin-a' } as JwtPayload;
  const unlinkedClinicianUser: JwtPayload = { sub: 'u5', roles: ['clinician'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;

  const platformDrug = { id: 'drug-platform', client_org_id: null, name: 'Paracetamol', is_deleted: false };
  const orgADrug = { id: 'drug-a', client_org_id: 'org-a', name: 'Custom Org A Drug', is_deleted: false };
  const orgBDrug = { id: 'drug-b', client_org_id: 'org-b', name: 'Custom Org B Drug', is_deleted: false };

  beforeEach(async () => {
    prisma = {
      drugs: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      clinicianFavouriteDrugs: { findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn(), deleteMany: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [DrugsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(DrugsService);
  });

  describe('findAll', () => {
    it('scopes a normal org caller to platform-seeded rows OR their own org, never another org', async () => {
      await service.findAll(orgAUser);
      const where = prisma.drugs.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([{ client_org_id: null }, { client_org_id: 'org-a' }]);
    });

    it('does not scope at all for a platform operator', async () => {
      await service.findAll(platformUser);
      const where = prisma.drugs.findMany.mock.calls[0][0].where;
      expect(where.OR).toBeUndefined();
    });

    // REQ179 (IPD slice 3) — every pre-existing call site (prescription
    // builder, MAR order search) omits item_type entirely; this default is
    // what keeps gauze/implants out of their autocomplete once the column
    // exists, with zero change required at any of those call sites.
    it('defaults item_type to "drug" when the caller omits it', async () => {
      await service.findAll(orgAUser);
      const where = prisma.drugs.findMany.mock.calls[0][0].where;
      expect(where.item_type).toBe('drug');
    });

    it('scopes to the caller-supplied item_type when explicitly requested', async () => {
      await service.findAll(orgAUser, undefined, 'consumable');
      const where = prisma.drugs.findMany.mock.calls[0][0].where;
      expect(where.item_type).toBe('consumable');
    });

    it('marks a null-org row as platform-seeded and an org row as not', async () => {
      prisma.drugs.findMany.mockResolvedValue([platformDrug, orgADrug]);
      const result: any[] = await service.findAll(orgAUser);
      expect(result.find((d) => d.id === 'drug-platform')?.is_platform_seeded).toBe(true);
      expect(result.find((d) => d.id === 'drug-a')?.is_platform_seeded).toBe(false);
    });
  });

  describe('findOne', () => {
    it('a normal org caller can read a platform-seeded row', async () => {
      prisma.drugs.findUnique.mockResolvedValue(platformDrug);
      await expect(service.findOne('drug-platform', orgAUser)).resolves.toBeDefined();
    });

    it('a normal org caller can read their own org\'s custom row', async () => {
      prisma.drugs.findUnique.mockResolvedValue(orgADrug);
      await expect(service.findOne('drug-a', orgAUser)).resolves.toBeDefined();
    });

    it('a normal org caller is rejected reading another org\'s custom row (no cross-tenant leak)', async () => {
      prisma.drugs.findUnique.mockResolvedValue(orgBDrug);
      await expect(service.findOne('drug-b', orgAUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('stamps the caller\'s own org id on a new custom drug', async () => {
      prisma.drugs.create.mockResolvedValue({ ...orgADrug });
      await service.create({ name: 'Custom Org A Drug' } as any, orgAUser);
      expect(prisma.drugs.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-a' }) }));
    });

    it('stamps a null (platform-seeded) org id when a platform operator creates one', async () => {
      prisma.drugs.create.mockResolvedValue({ ...platformDrug });
      await service.create({ name: 'Paracetamol' } as any, platformUser);
      expect(prisma.drugs.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ client_org_id: undefined }) }));
    });

    // REQ173 — createDrug's @Auth() gate now also admits 'clinician'
    // (resolver-level change); this proves the service underneath it
    // scopes a clinician-authored drug to their own org exactly like a
    // manager's, not left/leaked to platform-seeded by omission.
    it('scopes a self-added drug to the clinician\'s own org, same as a manager', async () => {
      prisma.drugs.create.mockResolvedValue({ id: 'drug-new', client_org_id: 'org-a', name: 'Amoxicillin 500mg', is_deleted: false });
      await service.create({ name: 'Amoxicillin 500mg' } as any, clinicianUser);
      expect(prisma.drugs.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-a' }) }));
    });
  });

  describe('update / remove — write access is stricter than read access', () => {
    it('lets an org caller edit their own custom drug', async () => {
      prisma.drugs.findUnique.mockResolvedValue(orgADrug);
      prisma.drugs.update.mockResolvedValue({ ...orgADrug, name: 'Renamed' });
      await service.update('drug-a', { name: 'Renamed' } as any, orgAUser);
      expect(prisma.drugs.update).toHaveBeenCalledWith({ where: { id: 'drug-a' }, data: { name: 'Renamed' } });
    });

    it('rejects an org caller editing a platform-seeded row, even though they could read it', async () => {
      prisma.drugs.findUnique.mockResolvedValue(platformDrug);
      await expect(service.update('drug-platform', { name: 'Hijacked' } as any, orgAUser)).rejects.toThrow(ForbiddenException);
      expect(prisma.drugs.update).not.toHaveBeenCalled();
    });

    it('allows a platform operator to edit a platform-seeded row', async () => {
      prisma.drugs.findUnique.mockResolvedValue(platformDrug);
      prisma.drugs.update.mockResolvedValue({ ...platformDrug, name: 'Updated' });
      await service.update('drug-platform', { name: 'Updated' } as any, platformUser);
      expect(prisma.drugs.update).toHaveBeenCalled();
    });

    it('rejects an org caller deleting another org\'s custom drug', async () => {
      prisma.drugs.findUnique.mockResolvedValue(orgBDrug);
      await expect(service.remove('drug-b', orgAUser)).rejects.toThrow(NotFoundException);
      expect(prisma.drugs.update).not.toHaveBeenCalled();
    });

    it('soft-deletes rather than hard-deleting', async () => {
      prisma.drugs.findUnique.mockResolvedValue(orgADrug);
      prisma.drugs.update.mockResolvedValue({ ...orgADrug, is_deleted: true });
      await service.remove('drug-a', orgAUser);
      expect(prisma.drugs.update).toHaveBeenCalledWith({ where: { id: 'drug-a' }, data: { is_deleted: true } });
    });
  });

  // REQ173 — a clinician's personal single-drug quick-pick list.
  describe('findFavourites / addFavourite / removeFavourite (REQ173)', () => {
    it('self-scopes to the caller\'s own clinician_id', async () => {
      prisma.clinicianFavouriteDrugs.findMany.mockResolvedValue([{ drug: orgADrug }]);
      await service.findFavourites(clinicianUser);
      expect(prisma.clinicianFavouriteDrugs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinician_id: 'clin-a' }) }),
      );
    });

    it('returns an empty list for an unlinked clinician account, never every favourite', async () => {
      prisma.clinicianFavouriteDrugs.findMany.mockResolvedValue([]);
      await service.findFavourites(unlinkedClinicianUser);
      expect(prisma.clinicianFavouriteDrugs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinician_id: '__no_clinician_link__' }) }),
      );
    });

    it('re-validates the drug is visible to the caller before favouriting it (Hard Rule 6)', async () => {
      prisma.drugs.findUnique.mockResolvedValue(orgBDrug); // another org's private drug
      await expect(service.addFavourite('drug-b', clinicianUser)).rejects.toThrow(NotFoundException);
      expect(prisma.clinicianFavouriteDrugs.upsert).not.toHaveBeenCalled();
    });

    it('is idempotent — favouriting an already-favourited drug upserts, not errors', async () => {
      prisma.drugs.findUnique.mockResolvedValue(orgADrug);
      prisma.clinicianFavouriteDrugs.upsert.mockResolvedValue({});
      await expect(service.addFavourite('drug-a', clinicianUser)).resolves.toBe(true);
      expect(prisma.clinicianFavouriteDrugs.upsert).toHaveBeenCalledWith({
        where: { clinician_id_drug_id: { clinician_id: 'clin-a', drug_id: 'drug-a' } },
        create: { clinician_id: 'clin-a', drug_id: 'drug-a' },
        update: {},
      });
    });

    it('removeFavourite is idempotent when nothing exists', async () => {
      prisma.clinicianFavouriteDrugs.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.removeFavourite('drug-a', clinicianUser)).resolves.toBe(true);
      expect(prisma.clinicianFavouriteDrugs.deleteMany).toHaveBeenCalledWith({
        where: { clinician_id: 'clin-a', drug_id: 'drug-a' },
      });
    });
  });
});
