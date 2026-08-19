import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { LanguagesResolver } from './languages.resolver';
import { LanguagesService } from './languages.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

describe('LanguagesResolver', () => {
  let resolver: LanguagesResolver;
  let service: { findAll: jest.Mock; create: jest.Mock; update: jest.Mock; remove: jest.Mock };
  const reflector = new Reflector();

  beforeEach(async () => {
    service = { findAll: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [LanguagesResolver, { provide: LanguagesService, useValue: service }],
    }).compile();
    resolver = module.get(LanguagesResolver);
  });

  describe('role gating (@Auth annotations)', () => {
    it('leaves languages ungated for any authenticated role', () => {
      expect(reflector.get(ROLES_KEY, LanguagesResolver.prototype.languages)).toBeUndefined();
    });

    it.each([
      ['createLanguage', LanguagesResolver.prototype.createLanguage],
      ['updateLanguage', LanguagesResolver.prototype.updateLanguage],
      ['deleteLanguage', LanguagesResolver.prototype.deleteLanguage],
    ])('%s is gated to admin/super_admin', (_name, handler) => {
      expect(reflector.get(ROLES_KEY, handler)).toEqual(['admin', 'super_admin']);
    });
  });

  describe('toResult mapping (shared with lookups)', () => {
    it('createLanguage returns {success:true} on success', async () => {
      service.create.mockResolvedValue({ id: 'lang-1' });
      const result = await resolver.createLanguage({ name: 'X', code: 'x' } as any);
      expect(result).toEqual({ success: true, userErrors: [] });
    });

    it('createLanguage maps a ConflictException into {success:false, userErrors}', async () => {
      service.create.mockRejectedValue(new ConflictException('"X" already exists (case-insensitive match)'));
      const result = await resolver.createLanguage({ name: 'X', code: 'x' } as any);
      expect(result).toEqual({
        success: false,
        userErrors: [{ message: '"X" already exists (case-insensitive match)' }],
      });
    });

    it('deleteLanguage maps a ConflictException (default-language delete) into {success:false}', async () => {
      service.remove.mockRejectedValue(
        new ConflictException('Cannot delete the default language — set another language as default first'),
      );
      const result = await resolver.deleteLanguage('lang-en');
      expect(result.success).toBe(false);
      expect(result.userErrors[0].message).toContain('Cannot delete the default language');
    });

    it('updateLanguage maps a multi-message validation error into multiple userErrors', async () => {
      service.update.mockRejectedValue(new BadRequestException(['name should not be empty']));
      const result = await resolver.updateLanguage('lang-1', {} as any);
      expect(result.userErrors).toEqual([{ message: 'name should not be empty' }]);
    });

    it('re-throws a non-HttpException error rather than swallowing it', async () => {
      service.create.mockRejectedValue(new Error('db connection lost'));
      await expect(resolver.createLanguage({ name: 'X', code: 'x' } as any)).rejects.toThrow('db connection lost');
    });
  });
});
