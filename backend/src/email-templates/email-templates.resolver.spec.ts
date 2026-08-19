import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmailTemplatesResolver } from './email-templates.resolver';
import { EmailTemplatesService } from './email-templates.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

describe('EmailTemplatesResolver', () => {
  let resolver: EmailTemplatesResolver;
  let service: { findAll: jest.Mock; update: jest.Mock };
  const reflector = new Reflector();

  beforeEach(async () => {
    service = { findAll: jest.fn(), update: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailTemplatesResolver, { provide: EmailTemplatesService, useValue: service }],
    }).compile();
    resolver = module.get(EmailTemplatesResolver);
  });

  describe('role gating (@Auth annotations)', () => {
    it('leaves emailTemplates ungated for any authenticated role', () => {
      expect(reflector.get(ROLES_KEY, EmailTemplatesResolver.prototype.emailTemplates)).toBeUndefined();
    });

    it('gates updateEmailTemplate to admin/super_admin', () => {
      expect(reflector.get(ROLES_KEY, EmailTemplatesResolver.prototype.updateEmailTemplate)).toEqual([
        'admin',
        'super_admin',
      ]);
    });
  });

  describe('updateEmailTemplate — error mapping', () => {
    it('returns {success:true, template} on success', async () => {
      service.update.mockResolvedValue({ id: 'tpl-1', subject: 'x' });
      const result = await resolver.updateEmailTemplate('tpl-1', { subject: 'x', body: 'y' } as any);
      expect(result).toEqual({ success: true, userErrors: [], template: { id: 'tpl-1', subject: 'x' } });
    });

    it('maps a NotFoundException into {success:false, userErrors} instead of throwing', async () => {
      service.update.mockRejectedValue(new NotFoundException('Email template not found'));
      const result = await resolver.updateEmailTemplate('missing', { subject: 'x', body: 'y' } as any);
      expect(result).toEqual({ success: false, userErrors: [{ message: 'Email template not found' }] });
    });

    it('maps a BadRequestException (unknown token) into {success:false, userErrors}', async () => {
      service.update.mockRejectedValue(new BadRequestException('Unknown template variable(s): {{bad}}'));
      const result = await resolver.updateEmailTemplate('tpl-1', { subject: 'x', body: 'y' } as any);
      expect(result.success).toBe(false);
      expect(result.userErrors).toEqual([{ message: 'Unknown template variable(s): {{bad}}' }]);
    });

    it('maps a multi-message validation error into multiple userErrors', async () => {
      service.update.mockRejectedValue(new BadRequestException(['subject should not be empty', 'body should not be empty']));
      const result = await resolver.updateEmailTemplate('tpl-1', {} as any);
      expect(result.userErrors).toEqual([
        { message: 'subject should not be empty' },
        { message: 'body should not be empty' },
      ]);
    });

    it('re-throws a non-HttpException error rather than swallowing it', async () => {
      service.update.mockRejectedValue(new Error('db connection lost'));
      await expect(resolver.updateEmailTemplate('tpl-1', { subject: 'x', body: 'y' } as any)).rejects.toThrow(
        'db connection lost',
      );
    });
  });
});
