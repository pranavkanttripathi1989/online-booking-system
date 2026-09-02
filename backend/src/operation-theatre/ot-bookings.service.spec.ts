import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { OtBookingsService } from './ot-bookings.service';
import { OperationTheatresService } from './operation-theatres.service';
import { PrismaService } from '../prisma/prisma.service';
import { IpdBillingService } from '../ipd-billing/ipd-billing.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('OtBookingsService', () => {
  let service: OtBookingsService;
  let prisma: any;
  let theatresService: any;
  let billingService: any;

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;

  const theatreA = { id: 'theatre-a', client_org_id: 'org-a', clinic_id: 'clinic-a', name: 'OT-1', default_turnaround_minutes: 30, is_active: true };
  const admissionA = { id: 'adm-a', client_org_id: 'org-a', clinic_id: 'clinic-a', is_deleted: false };
  const clinicianA = { id: 'clin-a', is_deleted: false, clinic: { client_org_id: 'org-a' } };

  const bookingA = {
    id: 'booking-a',
    client_org_id: 'org-a',
    status: 'scheduled',
    theatre_id: 'theatre-a',
    admission_id: 'adm-a',
    start_at: new Date('2026-09-05T09:00:00Z'),
    theatre: theatreA,
    admission: { admission_number: 'ADM-1', patient: { first_name: 'Jane', last_name: 'Doe' } },
    primary_surgeon: { first_name: 'Sam', last_name: 'Rao' },
    anesthetist: null,
    staff: [],
    checklists: [],
    consumables: [],
  };

  beforeEach(async () => {
    prisma = {
      admissions: { findUnique: jest.fn().mockResolvedValue(admissionA) },
      clinicians: { findUnique: jest.fn().mockResolvedValue(clinicianA) },
      appointments: { findMany: jest.fn().mockResolvedValue([]) },
      otBookings: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      otChecklists: { findMany: jest.fn().mockResolvedValue([]) },
      otBookingStaff: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
      userProfiles: { findUnique: jest.fn() },
      operationTheatres: { findUnique: jest.fn().mockResolvedValue({ ...theatreA, usage_charge_product_id: null }) },
    };
    theatresService = { assertTheatreInScope: jest.fn().mockResolvedValue(theatreA) };
    billingService = { postCharge: jest.fn().mockResolvedValue({ id: 'charge-1' }), priceProductForAdmission: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtBookingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: OperationTheatresService, useValue: theatresService },
        { provide: IpdBillingService, useValue: billingService },
      ],
    }).compile();
    service = module.get(OtBookingsService);
  });

  const validInput = {
    admission_id: 'adm-a',
    theatre_id: 'theatre-a',
    procedure_name: 'Appendectomy',
    primary_surgeon_clinician_id: 'clin-a',
    start_at: new Date('2026-09-05T09:00:00Z'),
    end_at: new Date('2026-09-05T11:00:00Z'),
  };

  describe('create', () => {
    it('rejects end_at not after start_at', async () => {
      await expect(
        service.create({ ...validInput, end_at: new Date('2026-09-05T08:00:00Z') } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.otBookings.create).not.toHaveBeenCalled();
    });

    it('rejects a cross-org admission', async () => {
      prisma.admissions.findUnique.mockResolvedValue({ ...admissionA, client_org_id: 'org-b' });
      await expect(service.create(validInput as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects a theatre/admission clinic mismatch', async () => {
      prisma.admissions.findUnique.mockResolvedValue({ ...admissionA, clinic_id: 'clinic-b' });
      await expect(service.create(validInput as any, orgAUser)).rejects.toThrow('different clinic');
    });

    it('rejects a surgeon with an overlapping real OPD appointment', async () => {
      prisma.appointments.findMany.mockResolvedValue([
        { clinician_id: 'clin-a', appointment_time: new Date('2026-09-05T10:00:00Z'), duration_minutes: 30, status: 'scheduled', is_deleted: false },
      ]);
      await expect(service.create(validInput as any, orgAUser)).rejects.toThrow(ConflictException);
      expect(prisma.otBookings.create).not.toHaveBeenCalled();
    });

    it('allows a surgeon whose OPD appointment does not actually overlap', async () => {
      prisma.appointments.findMany.mockResolvedValue([
        { clinician_id: 'clin-a', appointment_time: new Date('2026-09-05T13:00:00Z'), duration_minutes: 30, status: 'scheduled', is_deleted: false },
      ]);
      prisma.otBookings.create.mockResolvedValue({ id: 'booking-a' });
      prisma.otBookings.findUnique.mockResolvedValue(bookingA);
      await service.create(validInput as any, orgAUser);
      expect(prisma.otBookings.create).toHaveBeenCalled();
    });

    it('snapshots turnaround_minutes from the theatre default when not overridden', async () => {
      prisma.otBookings.create.mockResolvedValue({ id: 'booking-a' });
      prisma.otBookings.findUnique.mockResolvedValue(bookingA);
      await service.create(validInput as any, orgAUser);
      expect(prisma.otBookings.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ turnaround_minutes: 30 }) }),
      );
    });

    it('uses a caller-supplied turnaround override instead of the theatre default', async () => {
      prisma.otBookings.create.mockResolvedValue({ id: 'booking-a' });
      prisma.otBookings.findUnique.mockResolvedValue(bookingA);
      await service.create({ ...validInput, turnaround_minutes: 60 } as any, orgAUser);
      expect(prisma.otBookings.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ turnaround_minutes: 60 }) }),
      );
    });

    it('translates a theatre-overlap exclusion violation into a clean conflict message', async () => {
      prisma.otBookings.create.mockRejectedValue(new Error('conflicting key value violates exclusion constraint "ot_bookings_no_theatre_overlap"'));
      await expect(service.create(validInput as any, orgAUser)).rejects.toThrow(ConflictException);
    });

    it('translates a surgeon-overlap exclusion violation into a clean conflict message', async () => {
      prisma.otBookings.create.mockRejectedValue(new Error('conflicting key value violates exclusion constraint "ot_bookings_no_surgeon_overlap"'));
      await expect(service.create(validInput as any, orgAUser)).rejects.toThrow(ConflictException);
    });
  });

  describe('start / complete', () => {
    it('rejects starting a non-scheduled booking', async () => {
      prisma.otBookings.findUnique.mockResolvedValue({ ...bookingA, status: 'in_progress' });
      await expect(service.start('booking-a', orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects completing a non-in_progress booking', async () => {
      prisma.otBookings.findUnique.mockResolvedValue({ ...bookingA, status: 'scheduled' });
      await expect(service.complete('booking-a', orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects completing when the WHO checklist is not fully done', async () => {
      prisma.otBookings.findUnique.mockResolvedValue({ ...bookingA, status: 'in_progress' });
      prisma.otChecklists.findMany.mockResolvedValue([{ phase: 'sign_in', completed_at: new Date() }]);
      await expect(service.complete('booking-a', orgAUser)).rejects.toThrow(/time_out/);
    });

    it('completes when all 3 WHO checklist phases are done', async () => {
      prisma.otBookings.findUnique
        .mockResolvedValueOnce({ ...bookingA, status: 'in_progress' })
        .mockResolvedValueOnce(bookingA);
      prisma.otChecklists.findMany.mockResolvedValue([
        { phase: 'sign_in', completed_at: new Date() },
        { phase: 'time_out', completed_at: new Date() },
        { phase: 'sign_out', completed_at: new Date() },
      ]);
      await service.complete('booking-a', orgAUser);
      expect(prisma.otBookings.update).toHaveBeenCalledWith({ where: { id: 'booking-a' }, data: { status: 'completed' } });
    });

    it('does not post a usage charge when the theatre has none configured', async () => {
      prisma.otBookings.findUnique.mockResolvedValueOnce({ ...bookingA, status: 'in_progress' }).mockResolvedValueOnce(bookingA);
      prisma.otChecklists.findMany.mockResolvedValue([
        { phase: 'sign_in', completed_at: new Date() },
        { phase: 'time_out', completed_at: new Date() },
        { phase: 'sign_out', completed_at: new Date() },
      ]);
      await service.complete('booking-a', orgAUser);
      expect(billingService.postCharge).not.toHaveBeenCalled();
    });

    it('posts a flat theatre-usage charge dated to the booking start when configured', async () => {
      prisma.operationTheatres.findUnique.mockResolvedValue({ ...theatreA, usage_charge_product_id: 'prod-ot' });
      billingService.priceProductForAdmission.mockResolvedValue(150000);
      prisma.otBookings.findUnique.mockResolvedValueOnce({ ...bookingA, status: 'in_progress' }).mockResolvedValueOnce(bookingA);
      prisma.otChecklists.findMany.mockResolvedValue([
        { phase: 'sign_in', completed_at: new Date() },
        { phase: 'time_out', completed_at: new Date() },
        { phase: 'sign_out', completed_at: new Date() },
      ]);
      await service.complete('booking-a', orgAUser);
      expect(billingService.postCharge).toHaveBeenCalledWith(
        expect.objectContaining({
          admissionId: 'adm-a',
          chargeType: 'ot_usage',
          productId: 'prod-ot',
          unitPricePaise: 150000,
          serviceDate: bookingA.start_at,
          sourceReferenceType: 'ot_booking',
          sourceReferenceId: 'booking-a',
        }),
      );
    });

    it('rejects a cross-org booking transition', async () => {
      prisma.otBookings.findUnique.mockResolvedValue({ ...bookingA, client_org_id: 'org-b' });
      await expect(service.start('booking-a', orgAUser)).rejects.toThrow();
    });
  });

  describe('cancel', () => {
    it('rejects cancelling a completed booking', async () => {
      prisma.otBookings.findUnique.mockResolvedValue({ ...bookingA, status: 'completed' });
      const result = await service.cancel({ booking_id: 'booking-a', reason: 'x' } as any, orgAUser);
      expect(result.success).toBe(false);
    });

    it('cancels a scheduled booking with a reason', async () => {
      prisma.otBookings.findUnique.mockResolvedValue(bookingA);
      const result = await service.cancel({ booking_id: 'booking-a', reason: 'Patient unfit' } as any, orgAUser);
      expect(result.success).toBe(true);
      expect(prisma.otBookings.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'cancelled', is_cancelled: true, cancel_reason: 'Patient unfit' }) }),
      );
    });

    it('returns a not-found error for a cross-org booking', async () => {
      prisma.otBookings.findUnique.mockResolvedValue({ ...bookingA, client_org_id: 'org-b' });
      const result = await service.cancel({ booking_id: 'booking-a', reason: 'x' } as any, orgAUser);
      expect(result.success).toBe(false);
    });
  });

  describe('assignStaff / removeStaff', () => {
    it('rejects assigning a cross-org user', async () => {
      prisma.otBookings.findUnique.mockResolvedValue(bookingA);
      prisma.userProfiles.findUnique.mockResolvedValue({ id: 'u9', is_deleted: false, client_org_id: 'org-b' });
      await expect(service.assignStaff({ booking_id: 'booking-a', user_id: 'u9', role: 'scrub_nurse' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('assigns a valid staff member', async () => {
      prisma.otBookings.findUnique.mockResolvedValueOnce(bookingA).mockResolvedValueOnce(bookingA);
      prisma.userProfiles.findUnique.mockResolvedValue({ id: 'u9', is_deleted: false, client_org_id: 'org-a' });
      await service.assignStaff({ booking_id: 'booking-a', user_id: 'u9', role: 'scrub_nurse' } as any, orgAUser);
      expect(prisma.otBookingStaff.create).toHaveBeenCalledWith({ data: { booking_id: 'booking-a', user_id: 'u9', role: 'scrub_nurse' } });
    });

    it('rejects removing a staff assignment from a cross-org booking', async () => {
      prisma.otBookingStaff.findUnique.mockResolvedValue({ id: 'assign-1', booking_id: 'booking-a', booking: { client_org_id: 'org-b' } });
      await expect(service.removeStaff('assign-1', orgAUser)).rejects.toThrow();
      expect(prisma.otBookingStaff.delete).not.toHaveBeenCalled();
    });
  });

  describe('findAllForAdmission', () => {
    it('rejects a cross-org admission', async () => {
      prisma.admissions.findUnique.mockResolvedValue({ ...admissionA, client_org_id: 'org-b' });
      await expect(service.findAllForAdmission('adm-a', orgAUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('rejects a cross-org booking without confirming it exists differently than a real 404', async () => {
      prisma.otBookings.findUnique.mockResolvedValue({ ...bookingA, client_org_id: 'org-b' });
      await expect(service.findOne('booking-a', orgAUser)).rejects.toThrow(NotFoundException);
    });
  });
});
