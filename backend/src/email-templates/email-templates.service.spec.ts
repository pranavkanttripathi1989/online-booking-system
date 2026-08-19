import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmailTemplatesService } from './email-templates.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EmailTemplatesService', () => {
  let service: EmailTemplatesService;
  let prisma: {
    emailTemplates: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const existing = {
    id: 'tpl-1',
    name: 'Appointment Confirmation',
    template_type: 'APPOINTMENT_CONFIRMATION',
    subject: 'Your appointment with {{clinician_name}}',
    body: 'Hi {{patient_name}}, see you on {{appointment_date}}.',
    variables: ['patient_name', 'clinician_name', 'appointment_date'],
    is_active: true,
    is_deleted: false,
  };

  beforeEach(async () => {
    prisma = {
      emailTemplates: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailTemplatesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(EmailTemplatesService);
  });

  describe('findAll', () => {
    it('excludes soft-deleted templates and maps template_type to type', async () => {
      prisma.emailTemplates.findMany.mockResolvedValue([existing]);
      const result = await service.findAll();
      expect(prisma.emailTemplates.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { is_deleted: false } }),
      );
      expect(result).toEqual([
        {
          id: 'tpl-1',
          name: 'Appointment Confirmation',
          type: 'APPOINTMENT_CONFIRMATION',
          subject: existing.subject,
          body: existing.body,
          variables: existing.variables,
          is_active: true,
          is_deleted: false,
        },
      ]);
    });
  });

  describe('update — {{token}} validation (TC-ADMIN-UNIT-004/API-009)', () => {
    it('rejects when the template does not exist', async () => {
      prisma.emailTemplates.findUnique.mockResolvedValue(null);
      await expect(
        service.update('missing', { subject: 'x', body: 'y' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects a soft-deleted template', async () => {
      prisma.emailTemplates.findUnique.mockResolvedValue({ ...existing, is_deleted: true });
      await expect(
        service.update('tpl-1', { subject: 'x', body: 'y' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('accepts subject/body using only allowed tokens', async () => {
      prisma.emailTemplates.findUnique.mockResolvedValue(existing);
      prisma.emailTemplates.update.mockResolvedValue({
        ...existing,
        subject: 'Hello {{clinician_name}}',
        body: 'See you {{appointment_date}}',
      });
      const result = await service.update('tpl-1', {
        subject: 'Hello {{clinician_name}}',
        body: 'See you {{appointment_date}}',
      } as any);
      expect(prisma.emailTemplates.update).toHaveBeenCalledWith({
        where: { id: 'tpl-1' },
        data: { subject: 'Hello {{clinician_name}}', body: 'See you {{appointment_date}}' },
      });
      expect(result.type).toBe('APPOINTMENT_CONFIRMATION');
    });

    it('rejects a token outside the template variables set, without writing', async () => {
      prisma.emailTemplates.findUnique.mockResolvedValue(existing);
      await expect(
        service.update('tpl-1', { subject: 'Hi {{unknown_token}}', body: 'x' } as any),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.emailTemplates.update).not.toHaveBeenCalled();
    });

    it('ignores brace-like text that is not a well-formed {{token}}', async () => {
      prisma.emailTemplates.findUnique.mockResolvedValue(existing);
      prisma.emailTemplates.update.mockResolvedValue(existing);
      await expect(
        service.update('tpl-1', { subject: 'Cost is {5}', body: 'plain text' } as any),
      ).resolves.toBeDefined();
    });
  });
});
