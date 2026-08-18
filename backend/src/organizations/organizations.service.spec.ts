import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { OrganizationsService, normalizeOrgCode } from './organizations.service';
import { PrismaService } from '../prisma/prisma.service';

describe('normalizeOrgCode (TC-ONBOARD-UNIT-001/008)', () => {
  it('lowercases and hyphenates a normal name', () => {
    expect(normalizeOrgCode('City Care Clinic')).toBe('city-care-clinic');
  });

  it('collapses runs of non-alphanumeric characters into a single hyphen', () => {
    expect(normalizeOrgCode('City   Care!!  Clinic')).toBe('city-care-clinic');
  });

  it('trims leading/trailing whitespace and hyphens', () => {
    expect(normalizeOrgCode('  -City Care-  ')).toBe('city-care');
  });

  it('leaves an already-normalized code unchanged', () => {
    expect(normalizeOrgCode('citycare')).toBe('citycare');
  });
});

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: {
    clientOrganizations: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const existingOrg = {
    id: 'org-1',
    name: 'City Care',
    code: 'citycare',
    contact_email: 'owner@citycare.dev',
    contact_phone: null,
    address_structured: null,
    is_active: true,
    is_deleted: false,
  };

  beforeEach(async () => {
    prisma = {
      clientOrganizations: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(OrganizationsService);
  });

  describe('create (TC-ONBOARD-UNIT-009, TC-ONBOARD-API-002/008)', () => {
    it('rejects a duplicate code without writing', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(existingOrg);
      await expect(
        service.create({ name: 'Copycat', code: 'CityCare', contactEmail: 'a@b.com' } as any),
      ).rejects.toThrow(ConflictException);
      expect(prisma.clientOrganizations.create).not.toHaveBeenCalled();
    });

    it('normalizes the code and defaults to a completed, ownerless org', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(null);
      prisma.clientOrganizations.create.mockResolvedValue({
        ...existingOrg,
        id: 'org-new',
        code: 'new-clinic',
      });

      const result = await service.create({
        name: 'New Clinic',
        code: 'New   Clinic',
        contactEmail: 'a@b.com',
      } as any);

      expect(prisma.clientOrganizations.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'new-clinic',
            onboarding_status: 'completed',
            is_active: true,
          }),
        }),
      );
      expect(result.id).toBe('org-new');
    });

    it('respects an explicit is_active: false rather than defaulting it', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(null);
      prisma.clientOrganizations.create.mockResolvedValue(existingOrg);

      await service.create({ name: 'X', code: 'x', contactEmail: 'a@b.com', is_active: false } as any);

      expect(prisma.clientOrganizations.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ is_active: false }) }),
      );
    });

    it('maps contact_email/contact_phone/address_structured to the GraphQL camelCase shape', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(null);
      prisma.clientOrganizations.create.mockResolvedValue({
        ...existingOrg,
        contact_email: 'a@b.com',
        contact_phone: '+911234567890',
        address_structured: { line1: 'A', city: 'B', state: 'C', pincode: '123456', country: 'India' },
      });

      const result = await service.create({ name: 'X', code: 'x', contactEmail: 'a@b.com' } as any);

      expect(result.contactEmail).toBe('a@b.com');
      expect(result.contactPhone).toBe('+911234567890');
      expect(result.address).toEqual({ line1: 'A', city: 'B', state: 'C', pincode: '123456', country: 'India' });
      expect((result as any).contact_email).toBeUndefined();
      expect((result as any).address_structured).toBeUndefined();
    });
  });

  describe('update', () => {
    it('rejects updating a non-existent org', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(null);
      await expect(
        service.update('missing-id', { name: 'X', code: 'x', contactEmail: 'a@b.com' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects updating a soft-deleted org', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue({ ...existingOrg, is_deleted: true });
      await expect(
        service.update('org-1', { name: 'X', code: 'x', contactEmail: 'a@b.com' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('does not re-check code availability when the code is unchanged', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValueOnce(existingOrg);
      prisma.clientOrganizations.update.mockResolvedValue(existingOrg);

      await service.update('org-1', { name: 'City Care Updated', code: 'citycare', contactEmail: 'a@b.com' } as any);

      // Only the initial existence lookup — no second findUnique for code-availability.
      expect(prisma.clientOrganizations.findUnique).toHaveBeenCalledTimes(1);
    });

    it('rejects renaming to a code already taken by a different org', async () => {
      prisma.clientOrganizations.findUnique
        .mockResolvedValueOnce(existingOrg) // existence lookup
        .mockResolvedValueOnce({ ...existingOrg, id: 'org-2', code: 'taken' }); // code-availability lookup

      await expect(
        service.update('org-1', { name: 'City Care', code: 'taken', contactEmail: 'a@b.com' } as any),
      ).rejects.toThrow(ConflictException);
      expect(prisma.clientOrganizations.update).not.toHaveBeenCalled();
    });

    it('allows renaming to a code that is free', async () => {
      prisma.clientOrganizations.findUnique
        .mockResolvedValueOnce(existingOrg)
        .mockResolvedValueOnce(null);
      prisma.clientOrganizations.update.mockResolvedValue({ ...existingOrg, code: 'new-code' });

      await expect(
        service.update('org-1', { name: 'City Care', code: 'new-code', contactEmail: 'a@b.com' } as any),
      ).resolves.toBeDefined();
      expect(prisma.clientOrganizations.update).toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('rejects deleting a non-existent org', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(null);
      await expect(service.softDelete('missing-id')).rejects.toThrow(NotFoundException);
      expect(prisma.clientOrganizations.update).not.toHaveBeenCalled();
    });

    it('rejects deleting an already-deleted org', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue({ ...existingOrg, is_deleted: true });
      await expect(service.softDelete('org-1')).rejects.toThrow(NotFoundException);
    });

    it('sets is_deleted and is_active false, and returns true', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(existingOrg);
      prisma.clientOrganizations.update.mockResolvedValue({ ...existingOrg, is_deleted: true, is_active: false });

      await expect(service.softDelete('org-1')).resolves.toBe(true);
      expect(prisma.clientOrganizations.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { is_deleted: true, is_active: false },
      });
    });
  });

  describe('findAllPaginated', () => {
    it('computes hasNextPage/hasPreviousPage correctly for a middle page', async () => {
      prisma.$transaction.mockResolvedValue([[existingOrg], 30]);

      const result = await service.findAllPaginated({ limit: 10, offset: 10 });

      expect(result.pageInfo).toEqual({ total: 30, limit: 10, offset: 10, hasNextPage: true, hasPreviousPage: true });
      expect(result.data).toHaveLength(1);
    });

    it('queries with is_deleted: false in the where clause', async () => {
      prisma.$transaction.mockImplementation(async (ops: Promise<any>[]) => Promise.all(ops));
      prisma.clientOrganizations.findMany.mockResolvedValue([]);
      prisma.clientOrganizations.count.mockResolvedValue(0);

      await service.findAllPaginated({});

      expect(prisma.clientOrganizations.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ is_deleted: false }) }),
      );
    });

    it('applies the search filter across name/code/contact_email', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      await service.findAllPaginated({ search: 'city' });
      // Smoke-check the service actually ran without throwing on a search term;
      // the where-clause shape itself is exercised via a real DB in Phase 4 (integration).
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('defaults to limit 25 / offset 0 when unspecified', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      const result = await service.findAllPaginated();
      expect(result.pageInfo.limit).toBe(25);
      expect(result.pageInfo.offset).toBe(0);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
    });
  });
});
