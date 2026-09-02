import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { NursingService } from './nursing.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('NursingService', () => {
  let service: NursingService;
  let prisma: any;

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['staff'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const orgBUser: JwtPayload = { sub: 'u2', roles: ['staff'], client_org_id: 'org-b', patient_id: null, clinician_id: null } as JwtPayload;
  const clinicianUser: JwtPayload = { sub: 'u3', roles: ['clinician'], client_org_id: 'org-a', patient_id: null, clinician_id: 'clin-a' } as JwtPayload;

  const admissionA = { id: 'adm-a', client_org_id: 'org-a', clinic_id: 'clinic-a', is_deleted: false };

  beforeEach(async () => {
    prisma = {
      admissions: { findUnique: jest.fn() },
      vitals: { createMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      intakeOutputRecords: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      admissionNotes: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      admissionNoteAddenda: { create: jest.fn() },
      wards: { findUnique: jest.fn() },
      shiftHandovers: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [NursingService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(NursingService);
    prisma.admissions.findUnique.mockResolvedValue(admissionA);
  });

  describe('recordAdmissionVitals', () => {
    it('rejects a cross-org admission', async () => {
      await expect(
        service.recordAdmissionVitals({ admission_id: 'adm-a', readings: [{ code: 'pulse_bpm', value: 80 }] } as any, orgBUser),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.vitals.createMany).not.toHaveBeenCalled();
    });

    it('derives the unit from the code server-side, never from the caller', async () => {
      await service.recordAdmissionVitals(
        { admission_id: 'adm-a', shift: 'morning', readings: [{ code: 'pulse_bpm', value: 80 }] } as any,
        orgAUser,
      );
      expect(prisma.vitals.createMany).toHaveBeenCalledWith({
        data: [{ admission_id: 'adm-a', code: 'pulse_bpm', value: 80, unit: 'bpm', shift: 'morning', recorded_by_user_id: 'u1' }],
      });
    });
  });

  describe('recordIntakeOutput', () => {
    it('rejects a category that does not match the direction', async () => {
      await expect(
        service.recordIntakeOutput({ admission_id: 'adm-a', direction: 'intake', category: 'urine', volume_ml: 100, shift: 'morning' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.intakeOutputRecords.create).not.toHaveBeenCalled();
    });

    it('accepts a valid output category', async () => {
      prisma.intakeOutputRecords.create.mockResolvedValue({ id: 'io-1', direction: 'output', category: 'urine', volume_ml: 300, recorded_at: new Date(), shift: 'morning' });
      const result = await service.recordIntakeOutput(
        { admission_id: 'adm-a', direction: 'output', category: 'urine', volume_ml: 300, shift: 'morning' } as any,
        orgAUser,
      );
      expect(result.category).toBe('urine');
      expect(prisma.intakeOutputRecords.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-a', direction: 'output', category: 'urine', volume_ml: 300 }) }),
      );
    });
  });

  describe('intakeOutputBalance', () => {
    it('sums intake and output within the window into a signed balance', async () => {
      const now = new Date();
      prisma.intakeOutputRecords.findMany.mockResolvedValue([
        { direction: 'intake', volume_ml: 500 },
        { direction: 'intake', volume_ml: 300 },
        { direction: 'output', volume_ml: 400 },
      ]);
      const balance = await service.intakeOutputBalance('adm-a', 24, orgAUser);
      expect(balance.total_intake_ml).toBe(800);
      expect(balance.total_output_ml).toBe(400);
      expect(balance.balance_ml).toBe(400);
      expect(balance.window_end.getTime()).toBeGreaterThanOrEqual(now.getTime());
    });
  });

  describe('admission notes', () => {
    it('creates a note stamped with the caller and their clinician identity when present', async () => {
      prisma.admissionNotes.create.mockResolvedValue({ id: 'note-1', addenda: [] });
      await service.createAdmissionNote({ admission_id: 'adm-a', note_kind: 'doctor_round', assessment: 'Stable' } as any, clinicianUser);
      expect(prisma.admissionNotes.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ author_user_id: 'u3', author_clinician_id: 'clin-a', note_kind: 'doctor_round' }) }),
      );
    });

    it('rejects signing an already-signed note', async () => {
      prisma.admissionNotes.findUnique.mockResolvedValue({ id: 'note-1', client_org_id: 'org-a', locked: true });
      await expect(service.signAdmissionNote({ note_id: 'note-1' } as any, orgAUser)).rejects.toThrow(BadRequestException);
      expect(prisma.admissionNotes.update).not.toHaveBeenCalled();
    });

    it('rejects signing a cross-org note', async () => {
      prisma.admissionNotes.findUnique.mockResolvedValue({ id: 'note-1', client_org_id: 'org-b', locked: false });
      await expect(service.signAdmissionNote({ note_id: 'note-1' } as any, orgAUser)).rejects.toThrow();
      expect(prisma.admissionNotes.update).not.toHaveBeenCalled();
    });

    it('allows adding an addendum regardless of lock state', async () => {
      prisma.admissionNotes.findUnique
        .mockResolvedValueOnce({ id: 'note-1', client_org_id: 'org-a', locked: true })
        .mockResolvedValueOnce({ id: 'note-1', addenda: [] });
      await service.addAdmissionNoteAddendum({ note_id: 'note-1', content: 'Follow-up' } as any, orgAUser);
      expect(prisma.admissionNoteAddenda.create).toHaveBeenCalledWith({
        data: { admission_note_id: 'note-1', author_id: 'u1', content: 'Follow-up', reason: undefined },
      });
    });
  });

  describe('shift handover', () => {
    it('rejects a cross-org ward', async () => {
      prisma.wards.findUnique.mockResolvedValue({ id: 'ward-b', is_deleted: false, client_org_id: 'org-b' });
      await expect(
        service.createShiftHandover({ admission_id: 'adm-a', ward_id: 'ward-b', from_shift: 'morning', to_shift: 'evening' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.shiftHandovers.create).not.toHaveBeenCalled();
    });

    it('rejects acknowledging an already-acknowledged handover', async () => {
      prisma.shiftHandovers.findUnique.mockResolvedValue({ id: 'h1', client_org_id: 'org-a', acknowledged_at: new Date(), to_user_id: null });
      await expect(service.acknowledgeShiftHandover({ handover_id: 'h1' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });
  });
});
