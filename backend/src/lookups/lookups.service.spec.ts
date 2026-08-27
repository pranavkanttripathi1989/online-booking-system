import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { LookupsService } from './lookups.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LookupsService', () => {
  let service: LookupsService;
  let prisma: {
    clinicianTypeModel: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock };
    roomTypeModel: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock };
    icd10Codes: { findMany: jest.Mock };
    procedureCodes: { findMany: jest.Mock };
  };

  const consultant = { id: 'ct-1', name: 'Consultant', description: null, is_active: true };

  const makeDelegate = () => ({
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  });

  beforeEach(async () => {
    prisma = {
      clinicianTypeModel: makeDelegate(),
      roomTypeModel: makeDelegate(),
      icd10Codes: { findMany: jest.fn() },
      procedureCodes: { findMany: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [LookupsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(LookupsService);
  });

  describe('findAll — dispatches to the model-specific delegate', () => {
    it('reads clinicianTypeModel for "clinicianTypeModel"', async () => {
      prisma.clinicianTypeModel.findMany.mockResolvedValue([consultant]);
      const result = await service.findAll('clinicianTypeModel');
      expect(prisma.clinicianTypeModel.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
      expect(prisma.roomTypeModel.findMany).not.toHaveBeenCalled();
      expect(result).toEqual([consultant]);
    });

    it('reads roomTypeModel for "roomTypeModel"', async () => {
      prisma.roomTypeModel.findMany.mockResolvedValue([]);
      await service.findAll('roomTypeModel');
      expect(prisma.roomTypeModel.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
      expect(prisma.clinicianTypeModel.findMany).not.toHaveBeenCalled();
    });
  });

  describe('create — case-insensitive name uniqueness (TC-ADMIN-API-013/UNIT-009)', () => {
    it('rejects a duplicate name without creating', async () => {
      prisma.clinicianTypeModel.findMany.mockResolvedValue([consultant]);
      await expect(
        service.create('clinicianTypeModel', { name: 'consultant' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.clinicianTypeModel.create).not.toHaveBeenCalled();
    });

    it('creates when the name is free', async () => {
      prisma.clinicianTypeModel.findMany.mockResolvedValue([]);
      prisma.clinicianTypeModel.create.mockResolvedValue({ id: 'ct-2', name: 'Specialist' });
      const result = await service.create('clinicianTypeModel', { name: 'Specialist' });
      expect(prisma.clinicianTypeModel.create).toHaveBeenCalledWith({ data: { name: 'Specialist' } });
      expect(result.name).toBe('Specialist');
    });
  });

  describe('update', () => {
    it('rejects when the record does not exist', async () => {
      prisma.roomTypeModel.findUnique.mockResolvedValue(null);
      await expect(service.update('roomTypeModel', 'missing', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('skips the uniqueness check when name is not part of the update', async () => {
      prisma.clinicianTypeModel.findUnique.mockResolvedValue(consultant);
      prisma.clinicianTypeModel.update.mockResolvedValue({ ...consultant, is_active: false });
      await service.update('clinicianTypeModel', 'ct-1', { is_active: false });
      expect(prisma.clinicianTypeModel.findMany).not.toHaveBeenCalled();
    });

    it('excludes the record itself from its own uniqueness check', async () => {
      prisma.clinicianTypeModel.findUnique.mockResolvedValue(consultant);
      prisma.clinicianTypeModel.findMany.mockResolvedValue([consultant]); // only itself matches
      prisma.clinicianTypeModel.update.mockResolvedValue(consultant);
      await expect(service.update('clinicianTypeModel', 'ct-1', { name: 'Consultant' })).resolves.toBeDefined();
    });

    it('rejects renaming to a name used by a different record', async () => {
      const other = { id: 'ct-2', name: 'Specialist' };
      prisma.clinicianTypeModel.findUnique.mockResolvedValue(consultant);
      prisma.clinicianTypeModel.findMany.mockResolvedValue([other]);
      await expect(
        service.update('clinicianTypeModel', 'ct-1', { name: 'Specialist' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.clinicianTypeModel.update).not.toHaveBeenCalled();
    });
  });

  describe('remove — genuine hard delete (no is_deleted column on these models)', () => {
    it('rejects when the record does not exist', async () => {
      prisma.roomTypeModel.findUnique.mockResolvedValue(null);
      await expect(service.remove('roomTypeModel', 'missing')).rejects.toThrow(NotFoundException);
      expect(prisma.roomTypeModel.delete).not.toHaveBeenCalled();
    });

    it('hard-deletes an existing record', async () => {
      prisma.roomTypeModel.findUnique.mockResolvedValue({ id: 'rt-1', name: 'Exam Room' });
      prisma.roomTypeModel.delete.mockResolvedValue({ id: 'rt-1' });
      const result = await service.remove('roomTypeModel', 'rt-1');
      expect(prisma.roomTypeModel.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
      expect(result).toBe(true);
    });
  });

  // REQ108
  describe('icd10Codes', () => {
    it('with no search term, returns up to 20 active rows ordered by code', async () => {
      prisma.icd10Codes.findMany.mockResolvedValue([{ id: '1', code: 'A09', description: 'x', category: 'y' }]);
      await service.icd10Codes(undefined);
      expect(prisma.icd10Codes.findMany).toHaveBeenCalledWith({
        where: { is_active: true },
        orderBy: { code: 'asc' },
        take: 20,
      });
    });

    it('filters by code-prefix OR description-substring, case-insensitive, when a search term is given', async () => {
      prisma.icd10Codes.findMany.mockResolvedValue([]);
      await service.icd10Codes('J0');
      expect(prisma.icd10Codes.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          is_active: true,
          OR: [
            { code: { startsWith: 'J0', mode: 'insensitive' } },
            { description: { contains: 'J0', mode: 'insensitive' } },
          ],
        },
      }));
    });

    it('excludes inactive rows regardless of search term', async () => {
      await service.icd10Codes('fever');
      const where = prisma.icd10Codes.findMany.mock.calls[0][0].where;
      expect(where.is_active).toBe(true);
    });
  });

  // REQ154 (P2-02) -- identical contract to icd10Codes above
  describe('procedureCodes', () => {
    it('with no search term, returns up to 20 active rows ordered by code', async () => {
      prisma.procedureCodes.findMany.mockResolvedValue([{ id: '1', code: 'PR-001', description: 'x', category: 'y' }]);
      await service.procedureCodes(undefined);
      expect(prisma.procedureCodes.findMany).toHaveBeenCalledWith({
        where: { is_active: true },
        orderBy: { code: 'asc' },
        take: 20,
      });
    });

    it('filters by code-prefix OR description-substring, case-insensitive, when a search term is given', async () => {
      prisma.procedureCodes.findMany.mockResolvedValue([]);
      await service.procedureCodes('PR-0');
      expect(prisma.procedureCodes.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          is_active: true,
          OR: [
            { code: { startsWith: 'PR-0', mode: 'insensitive' } },
            { description: { contains: 'PR-0', mode: 'insensitive' } },
          ],
        },
      }));
    });

    it('excludes inactive rows regardless of search term', async () => {
      await service.procedureCodes('dressing');
      const where = prisma.procedureCodes.findMany.mock.calls[0][0].where;
      expect(where.is_active).toBe(true);
    });
  });
});
