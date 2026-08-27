import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: {
    reviews: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock; create: jest.Mock };
    appointments: { findUnique: jest.Mock };
  };
  let patientsService: { ownAndDependantPatientIds: jest.Mock };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u2', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const scopedReview = {
    id: 'rev-a1',
    is_deleted: false,
    stars: 5,
    comment: 'Great',
    response: null,
    created_at: new Date(),
    patient: { first_name: 'Priya', last_name: 'Shah' },
    clinician: { first_name: 'Dr', last_name: 'Rao' },
    clinic: { id: 'clinic-a', client_org_id: 'org-a' },
  };
  const otherOrgReview = { ...scopedReview, id: 'rev-b1', clinic: { id: 'clinic-b', client_org_id: 'org-b' } };

  beforeEach(async () => {
    prisma = {
      reviews: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
      appointments: { findUnique: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: prisma },
        // P1-06: create() self-scopes via ownAndDependantPatientIds() —
        // defaults to allowing 'pat-1' (every new create() test below uses
        // that id), exercised for real in patients.service.spec.ts.
        { provide: PatientsService, useValue: (patientsService = { ownAndDependantPatientIds: jest.fn().mockResolvedValue(['pat-1']) }) },
      ],
    }).compile();
    service = module.get(ReviewsService);
  });

  describe('findAll — tenant isolation + shaping', () => {
    it('scopes to the caller org via the clinic relation', async () => {
      prisma.reviews.findMany.mockResolvedValue([]);
      await service.findAll(undefined, orgAUser);
      expect(prisma.reviews.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinic: { client_org_id: 'org-a' } }) }),
      );
    });

    it('does not scope by org for a platform-wide caller', async () => {
      prisma.reviews.findMany.mockResolvedValue([]);
      await service.findAll(undefined, platformUser);
      const where = prisma.reviews.findMany.mock.calls[0][0].where;
      // BUG006: previously asserted `clinic: undefined`, which is exactly the
      // "no filter" value the bug produced — the test encoded the defect.
      expect(where).not.toHaveProperty('clinic');
    });

    it('an org-less NON-platform caller is scoped to an impossible sentinel', async () => {
      // BUG006 regression: `clinic: ... : undefined` left this caller able to
      // read every tenant's reviews, patient names and comments included.
      prisma.reviews.findMany.mockResolvedValue([]);
      const orgLess = { sub: 'u-9', roles: ['patient'], client_org_id: null } as any;
      await service.findAll(undefined, orgLess);
      const where = prisma.reviews.findMany.mock.calls[0][0].where;
      expect(where.clinic).toEqual({ client_org_id: '__no_org__' });
    });

    it('applies a stars filter when given', async () => {
      prisma.reviews.findMany.mockResolvedValue([]);
      await service.findAll({ stars: 5 } as any, orgAUser);
      expect(prisma.reviews.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ stars: 5 }) }),
      );
    });

    it('builds a case-insensitive OR search across comment and patient name', async () => {
      prisma.reviews.findMany.mockResolvedValue([]);
      await service.findAll({ search: 'great' } as any, orgAUser);
      const call = prisma.reviews.findMany.mock.calls[0][0];
      expect(call.where.OR).toEqual([
        { comment: { contains: 'great', mode: 'insensitive' } },
        { patient: { first_name: { contains: 'great', mode: 'insensitive' } } },
        { patient: { last_name: { contains: 'great', mode: 'insensitive' } } },
      ]);
    });

    it('shapes patient_name/clinician_name from the related records', async () => {
      prisma.reviews.findMany.mockResolvedValue([scopedReview]);
      const [result] = await service.findAll(undefined, orgAUser);
      expect(result.patient_name).toBe('Priya Shah');
      expect(result.clinician_name).toBe('Dr Rao');
    });

    it('omits clinician_name when the review has no clinician', async () => {
      prisma.reviews.findMany.mockResolvedValue([{ ...scopedReview, clinician: null }]);
      const [result] = await service.findAll(undefined, orgAUser);
      expect(result.clinician_name).toBeUndefined();
    });
  });

  describe('respondToReview — tenant isolation', () => {
    it('rejects when the review does not exist', async () => {
      prisma.reviews.findUnique.mockResolvedValue(null);
      await expect(service.respondToReview('missing', 'Thanks!', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects a soft-deleted review', async () => {
      prisma.reviews.findUnique.mockResolvedValue({ ...scopedReview, is_deleted: true });
      await expect(service.respondToReview('rev-a1', 'Thanks!', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects a cross-org response without ever calling update', async () => {
      prisma.reviews.findUnique.mockResolvedValue(otherOrgReview);
      await expect(service.respondToReview('rev-b1', 'Thanks!', orgAUser)).rejects.toThrow(NotFoundException);
      expect(prisma.reviews.update).not.toHaveBeenCalled();
    });

    it('writes the response with a responded_at timestamp for a same-org review', async () => {
      prisma.reviews.findUnique.mockResolvedValue(scopedReview);
      prisma.reviews.update.mockResolvedValue({ ...scopedReview, response: 'Thanks!' });
      const result = await service.respondToReview('rev-a1', 'Thanks!', orgAUser);
      expect(prisma.reviews.update).toHaveBeenCalledWith({
        where: { id: 'rev-a1' },
        data: { response: 'Thanks!', responded_at: expect.any(Date) },
        include: { patient: true, clinician: true },
      });
      expect(result).toEqual({ success: true, review: expect.objectContaining({ response: 'Thanks!' }) });
    });
  });

  describe('remove — tenant isolation', () => {
    it('rejects when the review does not exist', async () => {
      prisma.reviews.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects a cross-org delete without ever calling update', async () => {
      prisma.reviews.findUnique.mockResolvedValue(otherOrgReview);
      await expect(service.remove('rev-b1', orgAUser)).rejects.toThrow(NotFoundException);
      expect(prisma.reviews.update).not.toHaveBeenCalled();
    });

    it('soft-deletes a same-org review', async () => {
      prisma.reviews.findUnique.mockResolvedValue(scopedReview);
      prisma.reviews.update.mockResolvedValue({ ...scopedReview, is_deleted: true });
      const result = await service.remove('rev-a1', orgAUser);
      expect(prisma.reviews.update).toHaveBeenCalledWith({ where: { id: 'rev-a1' }, data: { is_deleted: true } });
      expect(result).toEqual({ success: true });
    });
  });

  // P1-06
  describe('create — patient submission', () => {
    const patientUser: JwtPayload = { sub: 'u-3', roles: ['patient'], client_org_id: 'org-a', patient_id: 'pat-1' } as JwtPayload;
    const completedAppointment = {
      id: 'appt-1', is_deleted: false, patient_id: 'pat-1', clinician_id: 'cln-1', clinic_id: 'clinic-a', status: 'completed',
    };
    const input = { appointment_id: 'appt-1', stars: 5, comment: 'Great visit' };

    it('rejects when the appointment does not exist', async () => {
      prisma.appointments.findUnique.mockResolvedValue(null);
      await expect(service.create(input as any, patientUser)).rejects.toThrow(NotFoundException);
    });

    it("rejects a caller reviewing an appointment that isn't their own or a dependant's (Hard Rule 6)", async () => {
      prisma.appointments.findUnique.mockResolvedValue({ ...completedAppointment, patient_id: 'someone-elses-patient-id' });
      await expect(service.create(input as any, patientUser)).rejects.toThrow(NotFoundException);
    });

    it("allows a genuine dependant's completed appointment", async () => {
      patientsService.ownAndDependantPatientIds.mockResolvedValue(['pat-1', 'pat-dependant']);
      prisma.appointments.findUnique.mockResolvedValue({ ...completedAppointment, patient_id: 'pat-dependant' });
      prisma.reviews.findUnique.mockResolvedValue(null);
      prisma.reviews.create.mockResolvedValue({
        id: 'rev-new', stars: 5, comment: 'Great visit', response: null, created_at: new Date(),
        patient: { first_name: 'A', last_name: 'B' }, clinician: { first_name: 'Dr', last_name: 'Rao' },
      });
      await expect(service.create(input as any, patientUser)).resolves.toEqual(expect.objectContaining({ success: true }));
    });

    it('rejects a not-yet-completed appointment', async () => {
      prisma.appointments.findUnique.mockResolvedValue({ ...completedAppointment, status: 'scheduled' });
      await expect(service.create(input as any, patientUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects (pre-check) when a review already exists for this appointment', async () => {
      prisma.appointments.findUnique.mockResolvedValue(completedAppointment);
      prisma.reviews.findUnique.mockResolvedValue({ id: 'rev-existing' });
      await expect(service.create(input as any, patientUser)).rejects.toThrow(ConflictException);
      expect(prisma.reviews.create).not.toHaveBeenCalled();
    });

    it('maps a genuinely concurrent duplicate submission (P2002 past the pre-check) to the same clean conflict error', async () => {
      prisma.appointments.findUnique.mockResolvedValue(completedAppointment);
      prisma.reviews.findUnique.mockResolvedValue(null);
      prisma.reviews.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' }));
      await expect(service.create(input as any, patientUser)).rejects.toThrow(ConflictException);
    });

    it('derives clinician_id/clinic_id from the appointment, never from client input (Hard Rule 6)', async () => {
      prisma.appointments.findUnique.mockResolvedValue(completedAppointment);
      prisma.reviews.findUnique.mockResolvedValue(null);
      prisma.reviews.create.mockResolvedValue({
        id: 'rev-new', stars: 5, comment: 'Great visit', response: null, created_at: new Date(),
        patient: { first_name: 'A', last_name: 'B' }, clinician: { first_name: 'Dr', last_name: 'Rao' },
      });
      await service.create({ ...input, clinician_id: 'attacker-supplied', clinic_id: 'attacker-supplied' } as any, patientUser);
      expect(prisma.reviews.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ clinician_id: 'cln-1', clinic_id: 'clinic-a' }) }),
      );
    });
  });

  describe('hasReviewForAppointment', () => {
    it('returns true when a review row exists, regardless of is_deleted', async () => {
      prisma.reviews.findUnique.mockResolvedValue({ id: 'rev-1' });
      await expect(service.hasReviewForAppointment('appt-1')).resolves.toBe(true);
    });

    it('returns false when none exists', async () => {
      prisma.reviews.findUnique.mockResolvedValue(null);
      await expect(service.hasReviewForAppointment('appt-1')).resolves.toBe(false);
    });
  });
});
