import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OtNotesService } from './ot-notes.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('OtNotesService', () => {
  let service: OtNotesService;
  let prisma: any;

  const clinicianUser: JwtPayload = { sub: 'u1', roles: ['clinician'], client_org_id: 'org-a', patient_id: null, clinician_id: 'clin-a' } as JwtPayload;
  const staffUser: JwtPayload = { sub: 'u2', roles: ['staff'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;

  const bookingA = { id: 'booking-a', client_org_id: 'org-a' };
  const noteA = { id: 'note-a', booking_id: 'booking-a', client_org_id: 'org-a', locked: false, pre_op_diagnosis: '', procedure_performed: '', findings: '', complications: '', post_op_diagnosis: '', post_op_instructions: '' };

  beforeEach(async () => {
    prisma = {
      otBookings: { findUnique: jest.fn().mockResolvedValue(bookingA) },
      otNotes: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [OtNotesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(OtNotesService);
  });

  describe('create', () => {
    it('rejects a cross-org booking', async () => {
      prisma.otBookings.findUnique.mockResolvedValue({ ...bookingA, client_org_id: 'org-b' });
      await expect(service.create({ booking_id: 'booking-a' } as any, clinicianUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects a second note for a booking that already has one', async () => {
      prisma.otNotes.findUnique.mockResolvedValue(noteA);
      await expect(service.create({ booking_id: 'booking-a' } as any, clinicianUser)).rejects.toThrow(BadRequestException);
      expect(prisma.otNotes.create).not.toHaveBeenCalled();
    });

    it('rejects a non-clinician caller', async () => {
      prisma.otNotes.findUnique.mockResolvedValue(null);
      await expect(service.create({ booking_id: 'booking-a' } as any, staffUser)).rejects.toThrow(BadRequestException);
    });

    it('stamps author_clinician_id from the caller', async () => {
      prisma.otNotes.findUnique.mockResolvedValue(null);
      prisma.otNotes.create.mockResolvedValue(noteA);
      await service.create({ booking_id: 'booking-a', findings: 'Uneventful' } as any, clinicianUser);
      expect(prisma.otNotes.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ author_clinician_id: 'clin-a', findings: 'Uneventful' }) }),
      );
    });
  });

  describe('update', () => {
    it('rejects editing a locked note', async () => {
      prisma.otNotes.findUnique.mockResolvedValue({ ...noteA, locked: true });
      await expect(service.update('booking-a', { findings: 'x' } as any, clinicianUser)).rejects.toThrow(BadRequestException);
      expect(prisma.otNotes.update).not.toHaveBeenCalled();
    });

    it('rejects a cross-org note', async () => {
      prisma.otNotes.findUnique.mockResolvedValue({ ...noteA, client_org_id: 'org-b' });
      await expect(service.update('booking-a', { findings: 'x' } as any, clinicianUser)).rejects.toThrow();
    });

    it('updates an unlocked note', async () => {
      prisma.otNotes.findUnique.mockResolvedValue(noteA);
      prisma.otNotes.update.mockResolvedValue({ ...noteA, findings: 'Uneventful' });
      await service.update('booking-a', { findings: 'Uneventful' } as any, clinicianUser);
      expect(prisma.otNotes.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ findings: 'Uneventful' }) }),
      );
    });
  });

  describe('sign', () => {
    it('rejects signing an already-signed note', async () => {
      prisma.otNotes.findUnique.mockResolvedValue({ ...noteA, locked: true });
      await expect(service.sign({ booking_id: 'booking-a' } as any, clinicianUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects a non-clinician caller', async () => {
      prisma.otNotes.findUnique.mockResolvedValue(noteA);
      await expect(service.sign({ booking_id: 'booking-a' } as any, staffUser)).rejects.toThrow(BadRequestException);
      expect(prisma.otNotes.update).not.toHaveBeenCalled();
    });

    it('locks and stamps signed_at', async () => {
      prisma.otNotes.findUnique.mockResolvedValue(noteA);
      prisma.otNotes.update.mockImplementation(({ data }: any) => ({ ...noteA, ...data }));
      const result = await service.sign({ booking_id: 'booking-a' } as any, clinicianUser);
      expect(result.locked).toBe(true);
      expect(prisma.otNotes.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ locked: true }) }),
      );
    });
  });

  describe('findByBooking', () => {
    it('rejects a cross-org booking', async () => {
      prisma.otBookings.findUnique.mockResolvedValue({ ...bookingA, client_org_id: 'org-b' });
      await expect(service.findByBooking('booking-a', clinicianUser)).rejects.toThrow(NotFoundException);
    });

    it('returns null when no note exists yet', async () => {
      prisma.otNotes.findUnique.mockResolvedValue(null);
      const result = await service.findByBooking('booking-a', clinicianUser);
      expect(result).toBeNull();
    });
  });
});
