import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DrugsService } from './drugs.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('DrugsService (REQ044)', () => {
  let service: DrugsService;
  let prisma: {
    drugs: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u3', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const platformDrug = { id: 'drug-platform', client_org_id: null, name: 'Paracetamol', is_deleted: false };
  const orgADrug = { id: 'drug-a', client_org_id: 'org-a', name: 'Custom Org A Drug', is_deleted: false };
  const orgBDrug = { id: 'drug-b', client_org_id: 'org-b', name: 'Custom Org B Drug', is_deleted: false };

  beforeEach(async () => {
    prisma = {
      drugs: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
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
});
