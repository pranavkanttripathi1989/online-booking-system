import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OtChecklistsService } from './ot-checklists.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('OtChecklistsService', () => {
  let service: OtChecklistsService;
  let prisma: any;

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['staff'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const bookingA = { id: 'booking-a', client_org_id: 'org-a' };
  const items = [{ key: 'patient_confirmed', label: 'Patient identity confirmed', checked: true }];

  beforeEach(async () => {
    prisma = {
      otBookings: { findUnique: jest.fn().mockResolvedValue(bookingA) },
      otChecklists: { findUnique: jest.fn(), upsert: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [OtChecklistsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(OtChecklistsService);
  });

  it('rejects a cross-org booking', async () => {
    prisma.otBookings.findUnique.mockResolvedValue({ ...bookingA, client_org_id: 'org-b' });
    await expect(service.complete({ booking_id: 'booking-a', phase: 'sign_in', items } as any, orgAUser)).rejects.toThrow(NotFoundException);
  });

  it('rejects completing an already-completed phase', async () => {
    prisma.otChecklists.findUnique.mockResolvedValue({ phase: 'sign_in', completed_at: new Date() });
    await expect(service.complete({ booking_id: 'booking-a', phase: 'sign_in', items } as any, orgAUser)).rejects.toThrow(BadRequestException);
    expect(prisma.otChecklists.upsert).not.toHaveBeenCalled();
  });

  it('completes a not-yet-done phase, stamping the caller and now', async () => {
    prisma.otChecklists.findUnique.mockResolvedValue(null);
    const bookingId = await service.complete({ booking_id: 'booking-a', phase: 'sign_in', items } as any, orgAUser);
    expect(bookingId).toBe('booking-a');
    expect(prisma.otChecklists.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { booking_id_phase: { booking_id: 'booking-a', phase: 'sign_in' } },
        create: expect.objectContaining({ completed_by_user_id: 'u1' }),
        update: expect.objectContaining({ completed_by_user_id: 'u1' }),
      }),
    );
  });

  it('allows re-attempting a phase that exists but was never completed (a partial draft row)', async () => {
    prisma.otChecklists.findUnique.mockResolvedValue({ phase: 'sign_in', completed_at: null });
    await expect(service.complete({ booking_id: 'booking-a', phase: 'sign_in', items } as any, orgAUser)).resolves.toBe('booking-a');
  });
});
