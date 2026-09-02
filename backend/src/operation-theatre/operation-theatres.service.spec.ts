import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OperationTheatresService } from './operation-theatres.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('OperationTheatresService', () => {
  let service: OperationTheatresService;
  let prisma: any;

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const orgBUser: JwtPayload = { sub: 'u2', roles: ['manager'], client_org_id: 'org-b', patient_id: null, clinician_id: null } as JwtPayload;

  const clinicA = { id: 'clinic-a', is_deleted: false, client_org_id: 'org-a' };
  const theatreA = { id: 'theatre-a', client_org_id: 'org-a', clinic_id: 'clinic-a', name: 'OT-1', default_turnaround_minutes: 30, is_active: true, is_deleted: false };

  beforeEach(async () => {
    prisma = {
      clinics: { findUnique: jest.fn() },
      operationTheatres: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      otBookings: { findFirst: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [OperationTheatresService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(OperationTheatresService);
    prisma.clinics.findUnique.mockResolvedValue(clinicA);
  });

  describe('create', () => {
    it('rejects a cross-org clinic', async () => {
      await expect(service.create({ clinic_id: 'clinic-a', name: 'OT-1' } as any, orgBUser)).rejects.toThrow(BadRequestException);
      expect(prisma.operationTheatres.create).not.toHaveBeenCalled();
    });

    it('defaults turnaround to 30 minutes when omitted', async () => {
      prisma.operationTheatres.create.mockResolvedValue(theatreA);
      await service.create({ clinic_id: 'clinic-a', name: 'OT-1' } as any, orgAUser);
      expect(prisma.operationTheatres.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ default_turnaround_minutes: 30, client_org_id: 'org-a' }) }),
      );
    });
  });

  describe('assertTheatreInScope', () => {
    it('rejects a cross-org theatre', async () => {
      prisma.operationTheatres.findUnique.mockResolvedValue({ ...theatreA, client_org_id: 'org-b' });
      await expect(service.assertTheatreInScope('theatre-a', orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects an inactive theatre', async () => {
      prisma.operationTheatres.findUnique.mockResolvedValue({ ...theatreA, is_active: false });
      await expect(service.assertTheatreInScope('theatre-a', orgAUser)).rejects.toThrow('not in service');
    });

    it('returns the theatre when in scope and active', async () => {
      prisma.operationTheatres.findUnique.mockResolvedValue(theatreA);
      const result = await service.assertTheatreInScope('theatre-a', orgAUser);
      expect(result.id).toBe('theatre-a');
    });
  });

  describe('update', () => {
    it('rejects a cross-org theatre', async () => {
      prisma.operationTheatres.findUnique.mockResolvedValue({ ...theatreA, client_org_id: 'org-b' });
      await expect(service.update('theatre-a', { name: 'New name' } as any, orgAUser)).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('rejects when the theatre still has a scheduled or in-progress booking', async () => {
      prisma.operationTheatres.findUnique.mockResolvedValue(theatreA);
      prisma.otBookings.findFirst.mockResolvedValue({ id: 'booking-1' });
      const result = await service.remove('theatre-a', orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.operationTheatres.update).not.toHaveBeenCalled();
    });

    it('soft-deletes when no live bookings remain', async () => {
      prisma.operationTheatres.findUnique.mockResolvedValue(theatreA);
      prisma.otBookings.findFirst.mockResolvedValue(null);
      const result = await service.remove('theatre-a', orgAUser);
      expect(result.success).toBe(true);
      expect(prisma.operationTheatres.update).toHaveBeenCalledWith({ where: { id: 'theatre-a' }, data: { is_deleted: true } });
    });

    it('returns a not-found error for a cross-org theatre without confirming it exists', async () => {
      prisma.operationTheatres.findUnique.mockResolvedValue({ ...theatreA, client_org_id: 'org-b' });
      const result = await service.remove('theatre-a', orgAUser);
      expect(result.success).toBe(false);
    });
  });

  describe('findOne', () => {
    it('rejects a cross-org theatre', async () => {
      prisma.operationTheatres.findUnique.mockResolvedValue({ ...theatreA, client_org_id: 'org-b' });
      await expect(service.findOne('theatre-a', orgAUser)).rejects.toThrow(NotFoundException);
    });
  });
});
