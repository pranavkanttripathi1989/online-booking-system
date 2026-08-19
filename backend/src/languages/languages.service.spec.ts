import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { LanguagesService } from './languages.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LanguagesService', () => {
  let service: LanguagesService;
  let prisma: {
    languages: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let tx: {
    languages: {
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
  };

  const english = { id: 'lang-en', name: 'English', code: 'en', is_active: true, is_default: true, is_deleted: false };
  const hindi = { id: 'lang-hi', name: 'Hindi', code: 'hi', is_active: true, is_default: false, is_deleted: false };

  beforeEach(async () => {
    tx = {
      languages: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
    };
    prisma = {
      languages: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn((cb) => cb(tx)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [LanguagesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(LanguagesService);
  });

  describe('findAll', () => {
    it('excludes soft-deleted languages', async () => {
      prisma.languages.findMany.mockResolvedValue([english]);
      await service.findAll();
      expect(prisma.languages.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { is_deleted: false } }),
      );
    });
  });

  describe('create — uniqueness (case-insensitive)', () => {
    it('rejects a duplicate name without creating', async () => {
      prisma.languages.findMany.mockResolvedValueOnce([english]); // name check
      await expect(
        service.create({ name: 'english', code: 'en2' } as any),
      ).rejects.toThrow(ConflictException);
      expect(tx.languages.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate code without creating', async () => {
      prisma.languages.findMany
        .mockResolvedValueOnce([]) // name check passes
        .mockResolvedValueOnce([english]); // code check fails
      await expect(
        service.create({ name: 'New Lang', code: 'EN' } as any),
      ).rejects.toThrow(ConflictException);
      expect(tx.languages.create).not.toHaveBeenCalled();
    });

    it('creates a non-default language without touching other defaults', async () => {
      prisma.languages.findMany.mockResolvedValue([]);
      tx.languages.create.mockResolvedValue(hindi);
      const result = await service.create({ name: 'Hindi', code: 'hi' } as any);
      expect(tx.languages.create).toHaveBeenCalledWith({
        data: { name: 'Hindi', code: 'hi', is_active: true, is_default: false },
      });
      expect(tx.languages.updateMany).not.toHaveBeenCalled();
      expect(result).toEqual(hindi);
    });

    it('clears the old default and sets the new one when is_default is requested (TC-ADMIN-UNIT-010)', async () => {
      prisma.languages.findMany.mockResolvedValue([]);
      tx.languages.create.mockResolvedValue({ ...hindi, is_default: false });
      tx.languages.findUniqueOrThrow.mockResolvedValue({ ...hindi, is_default: true });
      const result = await service.create({ name: 'Hindi', code: 'hi', is_default: true } as any);
      expect(tx.languages.updateMany).toHaveBeenCalledWith({
        where: { is_default: true, NOT: { id: hindi.id } },
        data: { is_default: false },
      });
      expect(tx.languages.update).toHaveBeenCalledWith({ where: { id: hindi.id }, data: { is_default: true } });
      expect(result.is_default).toBe(true);
    });
  });

  describe('update', () => {
    it('rejects when the language does not exist', async () => {
      prisma.languages.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('rejects a soft-deleted language', async () => {
      prisma.languages.findUnique.mockResolvedValue({ ...hindi, is_deleted: true });
      await expect(service.update('lang-hi', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('excludes the record itself from its own uniqueness check', async () => {
      prisma.languages.findUnique.mockResolvedValue(english);
      prisma.languages.findMany.mockResolvedValueOnce([english]); // name check — only itself matches
      tx.languages.update.mockResolvedValue(english);
      await expect(service.update('lang-en', { name: 'English' } as any)).resolves.toBeDefined();
    });

    it('rejects renaming to a name already used by a different language', async () => {
      prisma.languages.findUnique.mockResolvedValue(hindi);
      prisma.languages.findMany.mockResolvedValueOnce([english]); // name check — different id
      await expect(service.update('lang-hi', { name: 'English' } as any)).rejects.toThrow(ConflictException);
      expect(tx.languages.update).not.toHaveBeenCalled();
    });

    it('promotes to default via the same transactional swap as create', async () => {
      prisma.languages.findUnique.mockResolvedValue(hindi);
      tx.languages.update.mockResolvedValue(hindi);
      tx.languages.findUniqueOrThrow.mockResolvedValue({ ...hindi, is_default: true });
      const result = await service.update('lang-hi', { is_default: true } as any);
      expect(tx.languages.updateMany).toHaveBeenCalledWith({
        where: { is_default: true, NOT: { id: 'lang-hi' } },
        data: { is_default: false },
      });
      expect(result.is_default).toBe(true);
    });
  });

  describe('remove', () => {
    it('rejects when the language does not exist', async () => {
      prisma.languages.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('rejects deleting the default language', async () => {
      prisma.languages.findUnique.mockResolvedValue(english);
      await expect(service.remove('lang-en')).rejects.toThrow(ConflictException);
      expect(prisma.languages.update).not.toHaveBeenCalled();
    });

    it('soft-deletes and deactivates a non-default language', async () => {
      prisma.languages.findUnique.mockResolvedValue(hindi);
      prisma.languages.update.mockResolvedValue({ ...hindi, is_deleted: true, is_active: false });
      const result = await service.remove('lang-hi');
      expect(prisma.languages.update).toHaveBeenCalledWith({
        where: { id: 'lang-hi' },
        data: { is_deleted: true, is_active: false },
      });
      expect(result).toBe(true);
    });
  });
});
