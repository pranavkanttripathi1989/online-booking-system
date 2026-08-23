import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { PUB_SUB } from '../common/pubsub.provider';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Security regression coverage: appointments() previously only org-scoped,
// never self-scoped -- any authenticated 'patient' role account could read
// every appointment (reason, notes, other patients' names) within the org.
describe('AppointmentsService — access scoping', () => {
  let service: AppointmentsService;
  let prisma: {
    appointments: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
    appointmentStatusLogs: { findMany: jest.Mock; create: jest.Mock };
    clinics: { findUnique: jest.Mock };
    products: { findUnique: jest.Mock };
    rooms: { findFirst: jest.Mock; findUnique: jest.Mock };
    userProfiles: { findFirst: jest.Mock };
    clinicianAvailability: { findFirst: jest.Mock };
    resources: { count: jest.Mock };
    appointmentResources: { findFirst: jest.Mock; createMany: jest.Mock; deleteMany: jest.Mock; updateMany: jest.Mock };
    $executeRawUnsafe: jest.Mock;
    $transaction: jest.Mock;
  };
  let notificationTrigger: { dispatch: jest.Mock };

  const staffUser: JwtPayload = { sub: 'staff-1', roles: ['manager'], client_org_id: 'org-1' } as JwtPayload;
  const patientUser: JwtPayload = { sub: 'user-1', roles: ['patient'], client_org_id: 'org-1', patient_id: 'pat-1' } as JwtPayload;
  const unlinkedPatientUser: JwtPayload = { sub: 'user-2', roles: ['patient'], client_org_id: 'org-1', patient_id: null } as JwtPayload;
  const clinicianUser: JwtPayload = { sub: 'user-3', roles: ['clinician'], client_org_id: 'org-1', clinician_id: 'cln-1' } as JwtPayload;
  const unlinkedClinicianUser: JwtPayload = { sub: 'user-4', roles: ['clinician'], client_org_id: 'org-1', clinician_id: null } as JwtPayload;

  const baseAppointmentRow = {
    id: 'appt-1', is_deleted: false, patient_id: 'pat-1', clinician_id: 'cln-1',
    clinic: { client_org_id: 'org-1' },
    patient: { id: 'pat-1', first_name: 'A', last_name: 'B', date_of_birth: new Date() },
    clinician: { id: 'cln-1', first_name: 'X', last_name: 'Y' },
    room: {}, appointment_time: new Date(), duration_minutes: 30, status: 'scheduled',
  };

  beforeEach(async () => {
    prisma = {
      appointments: {
        findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), findUnique: jest.fn(), findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ ...baseAppointmentRow, ...args.data })),
        create: jest.fn().mockResolvedValue({
          id: 'appt-new', patient_id: 'pat-1', clinician_id: 'cln-1', clinic: { client_org_id: 'org-1' },
          patient: { id: 'pat-1', first_name: 'A', last_name: 'B', date_of_birth: new Date() },
          clinician: { id: 'cln-1', first_name: 'X', last_name: 'Y' }, room: {}, appointment_time: new Date(), duration_minutes: 30, status: 'scheduled',
        }),
      },
      appointmentStatusLogs: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
      clinics: { findUnique: jest.fn() },
      products: { findUnique: jest.fn().mockResolvedValue({ id: 'svc-1', duration_minutes: 30 }) },
      rooms: { findFirst: jest.fn().mockResolvedValue({ id: 'room-1' }), findUnique: jest.fn().mockResolvedValue({ id: 'room-1' }) },
      userProfiles: { findFirst: jest.fn().mockResolvedValue(null) },
      // REQ017: default to "no session/hybrid window" so every pre-existing
      // slot-mode test in this file keeps exercising slot mode unchanged.
      clinicianAvailability: { findFirst: jest.fn().mockResolvedValue(null) },
      resources: { count: jest.fn().mockResolvedValue(0) },
      appointmentResources: { findFirst: jest.fn().mockResolvedValue(null), createMany: jest.fn(), deleteMany: jest.fn(), updateMany: jest.fn() },
      $executeRawUnsafe: jest.fn(),
      $transaction: jest.fn((ops) => (typeof ops === 'function' ? ops(prisma) : Promise.all(ops))),
    };
    notificationTrigger = { dispatch: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PUB_SUB, useValue: { publish: jest.fn(), asyncIterableIterator: jest.fn() } },
        { provide: NotificationTriggerService, useValue: notificationTrigger },
      ],
    }).compile();
    service = module.get(AppointmentsService);
  });

  describe('findAll', () => {
    it('does not restrict by patient_id for a staff caller', async () => {
      await service.findAll(undefined, 20, 1, staffUser);
      const where = prisma.appointments.findMany.mock.calls[0][0].where;
      expect(where.patient_id).toBeUndefined();
    });

    it('restricts a patient caller to only their own linked patient_id', async () => {
      await service.findAll(undefined, 20, 1, patientUser);
      const where = prisma.appointments.findMany.mock.calls[0][0].where;
      expect(where.patient_id).toBe('pat-1');
    });

    it('an unlinked patient account (no patient_id) sees nothing, never falls through to "everyone"', async () => {
      await service.findAll(undefined, 20, 1, unlinkedPatientUser);
      const where = prisma.appointments.findMany.mock.calls[0][0].where;
      expect(where.patient_id).toBe('__no_patient_link__');
    });

    it('restricts a clinician caller to only their own linked clinician_id (TC-APPT-API-010)', async () => {
      await service.findAll(undefined, 20, 1, clinicianUser);
      const where = prisma.appointments.findMany.mock.calls[0][0].where;
      expect(where.clinician_id).toBe('cln-1');
    });

    it('an unlinked clinician account (no clinician_id) sees nothing, never falls through to "everyone"', async () => {
      await service.findAll(undefined, 20, 1, unlinkedClinicianUser);
      const where = prisma.appointments.findMany.mock.calls[0][0].where;
      expect(where.clinician_id).toBe('__no_clinician_link__');
    });
  });

  describe('create', () => {
    const baseInput = { clinician_id: 'cln-1', clinic_id: 'clinic-1', patient_id: 'pat-1', service_id: 'svc-1', start_datetime: new Date().toISOString(), notes: '' };

    it('rejects creating an appointment for a clinic in a different org (previously no check at all)', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-2' });
      await expect(service.create(baseInput as any, staffUser)).rejects.toThrow('Clinic not found');
      expect(prisma.products.findUnique).not.toHaveBeenCalled();
    });

    it('allows creating an appointment for a clinic in the caller\'s own org', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
      await expect(service.create(baseInput as any, staffUser)).resolves.toBeDefined();
    });

    // REQ008/PLAN017
    it('dispatches new_appointment to the clinician\'s linked profile', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
      prisma.userProfiles.findFirst.mockResolvedValue({ id: 'profile-cln-1' });
      await service.create(baseInput as any, staffUser);
      expect(notificationTrigger.dispatch).toHaveBeenCalledWith(
        'profile-cln-1',
        'new_appointment',
        expect.objectContaining({ type: 'appointment' }),
      );
    });

    it('does not dispatch when the clinician has no linked profile', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
      prisma.userProfiles.findFirst.mockResolvedValue(null);
      await service.create(baseInput as any, staffUser);
      expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
    });

    it('is a no-op for an org-less caller (patient self-serve booking goes through a separate mutation)', async () => {
      const orgLessPatient: JwtPayload = { sub: 'p-1', roles: ['patient'], client_org_id: null, patient_id: 'pat-1' } as JwtPayload;
      await expect(service.create(baseInput as any, orgLessPatient)).resolves.toBeDefined();
      expect(prisma.clinics.findUnique).not.toHaveBeenCalled();
    });

    // P3.1/F-16: the database-level EXCLUDE constraint
    // (appointments_no_overlapping_booking) is the real fix for
    // booking-concurrency.int-spec.ts; these confirm the raw Postgres error
    // it (or a related deadlock under real contention) surfaces as gets
    // mapped to the existing clean message, never leaked to the caller.
    describe('overlap-constraint error mapping', () => {
      it('maps the exclusion-violation error to "This time slot is no longer available"', async () => {
        prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
        prisma.$transaction.mockRejectedValueOnce(
          new Prisma.PrismaClientUnknownRequestError(
            'conflicting key value violates exclusion constraint "appointments_no_overlapping_booking"',
            { clientVersion: 'test' },
          ),
        );
        await expect(service.create(baseInput as any, staffUser)).rejects.toThrow('This time slot is no longer available');
      });

      it('also maps the room-overlap exclusion-violation error to the same message', async () => {
        prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
        prisma.$transaction.mockRejectedValueOnce(
          new Prisma.PrismaClientUnknownRequestError(
            'conflicting key value violates exclusion constraint "appointments_no_overlapping_room_booking"',
            { clientVersion: 'test' },
          ),
        );
        await expect(service.create(baseInput as any, staffUser)).rejects.toThrow('This time slot is no longer available');
      });

      it('also maps a deadlock (two truly-concurrent inserts on overlapping GiST pages) to the same message', async () => {
        prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
        prisma.$transaction.mockRejectedValueOnce(
          new Prisma.PrismaClientUnknownRequestError('deadlock detected', { clientVersion: 'test' }),
        );
        await expect(service.create(baseInput as any, staffUser)).rejects.toThrow('This time slot is no longer available');
      });

      it('does not swallow an unrelated database error behind the same friendly message', async () => {
        prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
        prisma.$transaction.mockRejectedValueOnce(
          new Prisma.PrismaClientUnknownRequestError('connection terminated unexpectedly', { clientVersion: 'test' }),
        );
        await expect(service.create(baseInput as any, staffUser)).rejects.toThrow('connection terminated unexpectedly');
      });
    });
  });

  describe('findOne', () => {
    const baseAppointment = (overrides: Partial<Record<string, unknown>> = {}) => ({
      id: 'appt-1',
      is_deleted: false,
      patient_id: 'pat-1',
      clinician_id: 'cln-1',
      clinic: { client_org_id: 'org-1' },
      patient: { id: 'pat-1', first_name: 'A', last_name: 'B', date_of_birth: new Date() },
      clinician: { id: 'cln-1', first_name: 'X', last_name: 'Y' },
      room: {},
      appointment_time: new Date(),
      duration_minutes: 30,
      status: 'scheduled',
      ...overrides,
    });

    it('a patient caller can load their own appointment', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointment());
      await expect(service.findOne('appt-1', patientUser)).resolves.toBeDefined();
    });

    it('a patient caller is rejected loading another patient\'s appointment', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointment({ patient_id: 'pat-2' }));
      await expect(service.findOne('appt-1', patientUser)).rejects.toThrow(NotFoundException);
    });

    it('a clinician caller can load their own appointment', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointment());
      await expect(service.findOne('appt-1', clinicianUser)).resolves.toBeDefined();
    });

    it('a clinician caller is rejected loading another clinician\'s appointment (TC-APPT-API-010)', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointment({ clinician_id: 'cln-2' }));
      await expect(service.findOne('appt-1', clinicianUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkIn / startConsultation / resetAppointmentJourney (REQ042)', () => {
    beforeEach(() => {
      prisma.appointments.findUnique.mockResolvedValue({ ...baseAppointmentRow });
    });

    it('checkIn transitions a scheduled appointment to checked_in and logs the change', async () => {
      const result = await service.checkIn('appt-1', staffUser);
      expect(result.status).toBe('checked_in');
      expect(prisma.appointments.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'appt-1' }, data: expect.objectContaining({ status: 'checked_in' }) }));
      expect(prisma.appointmentStatusLogs.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ appointment_id: 'appt-1', status: 'checked_in', changed_by_user_id: staffUser.sub }) }));
    });

    it('startConsultation transitions to in_consultation', async () => {
      const result = await service.startConsultation('appt-1', staffUser);
      expect(result.status).toBe('in_consultation');
    });

    it('resetAppointmentJourney transitions back to scheduled', async () => {
      prisma.appointments.findUnique.mockResolvedValue({ ...baseAppointmentRow, status: 'no_show' });
      const result = await service.resetAppointmentJourney('appt-1', staffUser);
      expect(result.status).toBe('scheduled');
    });

    it('checkIn is rejected for a cross-org caller (tenant isolation)', async () => {
      prisma.appointments.findUnique.mockResolvedValue({ ...baseAppointmentRow, clinic: { client_org_id: 'org-2' } });
      await expect(service.checkIn('appt-1', staffUser)).rejects.toThrow(NotFoundException);
      expect(prisma.appointments.update).not.toHaveBeenCalled();
    });

    it('checkIn is rejected for a clinician who is not on this appointment (self-scoping)', async () => {
      prisma.appointments.findUnique.mockResolvedValue({ ...baseAppointmentRow, clinician_id: 'cln-2' });
      await expect(service.checkIn('appt-1', clinicianUser)).rejects.toThrow(NotFoundException);
      expect(prisma.appointments.update).not.toHaveBeenCalled();
    });

    it('checkIn is rejected for a patient calling on someone else\'s appointment (self-scoping)', async () => {
      prisma.appointments.findUnique.mockResolvedValue({ ...baseAppointmentRow, patient_id: 'pat-2' });
      await expect(service.checkIn('appt-1', patientUser)).rejects.toThrow(NotFoundException);
    });
  });

  // REQ017 — session/hybrid mode capacity enforcement. Session mode
  // deliberately bypasses assertSlotFree/the DB exclusion constraint (many
  // tokens legitimately share the same clinician/room/time) — capacity is
  // enforced by a pg_advisory_xact_lock-guarded count-then-insert instead.
  describe('create — session/hybrid mode (REQ017)', () => {
    const sessionInput = { clinician_id: 'cln-1', clinic_id: 'clinic-1', patient_id: 'pat-1', service_id: 'svc-1', start_datetime: '2026-08-24T18:00:00.000Z', notes: '' };
    const sessionWindow = { mode: 'session', capacity: 40, overbook_allowance: 3, room_id: null };

    beforeEach(() => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
      prisma.clinicianAvailability.findFirst.mockResolvedValue(sessionWindow);
    });

    it('does not run the slot-conflict check for a session-mode booking', async () => {
      await service.create(sessionInput as any, staffUser);
      // assertSlotFree queries appointments.findFirst with booking_mode:
      // 'slot' — session mode must never call it at all.
      expect(prisma.appointments.findFirst).not.toHaveBeenCalled();
    });

    it('assigns sequential token_no from the current booked count', async () => {
      prisma.appointments.count.mockResolvedValue(5);
      await service.create(sessionInput as any, staffUser);
      expect(prisma.appointments.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ booking_mode: 'session', token_no: 6 }) }),
      );
    });

    it('rejects once capacity + overbook_allowance is reached', async () => {
      prisma.appointments.count.mockResolvedValue(43); // 40 capacity + 3 overbook
      await expect(service.create(sessionInput as any, staffUser)).rejects.toThrow('This session is fully booked');
      expect(prisma.appointments.create).not.toHaveBeenCalled();
    });

    it('accepts the last overbook slot (one below the reject threshold)', async () => {
      prisma.appointments.count.mockResolvedValue(42);
      await expect(service.create(sessionInput as any, staffUser)).resolves.toBeDefined();
    });

    it('serializes the count-then-insert with a Postgres advisory lock', async () => {
      await service.create(sessionInput as any, staffUser);
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('pg_advisory_xact_lock'),
        expect.any(String),
      );
    });

    it('uses the session window\'s own configured room when set, instead of the first-active-room fallback', async () => {
      prisma.clinicianAvailability.findFirst.mockResolvedValue({ ...sessionWindow, room_id: 'room-configured' });
      prisma.rooms.findUnique.mockResolvedValue({ id: 'room-configured' });
      await service.create(sessionInput as any, staffUser);
      expect(prisma.rooms.findUnique).toHaveBeenCalledWith({ where: { id: 'room-configured' } });
      expect(prisma.rooms.findFirst).not.toHaveBeenCalled();
    });
  });

  // REQ017 US-CAL-05 — multi-resource intersection booking, slot mode only.
  describe('create — multi-resource booking (REQ017)', () => {
    const baseInput = { clinician_id: 'cln-1', clinic_id: 'clinic-1', patient_id: 'pat-1', service_id: 'svc-1', start_datetime: new Date().toISOString(), notes: '', resource_ids: ['res-1', 'res-2'] };

    beforeEach(() => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
      prisma.resources.count.mockResolvedValue(2); // both resource_ids belong to the caller's org
    });

    it('rejects when a required resource belongs to a different org', async () => {
      prisma.resources.count.mockResolvedValue(1); // only one of the two resolves to this org
      await expect(service.create(baseInput as any, staffUser)).rejects.toThrow('Resource not found');
      expect(prisma.appointments.create).not.toHaveBeenCalled();
    });

    it('rejects when a required resource is already booked for the requested window', async () => {
      prisma.appointmentResources.findFirst.mockResolvedValue({ id: 'ar-1', resource_id: 'res-1' });
      await expect(service.create(baseInput as any, staffUser)).rejects.toThrow('This time slot is no longer available');
      expect(prisma.appointments.create).not.toHaveBeenCalled();
    });

    it('creates AppointmentResources rows for every free required resource', async () => {
      await service.create(baseInput as any, staffUser);
      expect(prisma.appointmentResources.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ appointment_id: 'appt-new', resource_id: 'res-1' }),
          expect.objectContaining({ appointment_id: 'appt-new', resource_id: 'res-2' }),
        ],
      });
    });

    it('does not touch AppointmentResources at all when no resource_ids are given (regression: existing slot-mode bookings unaffected)', async () => {
      const { resource_ids, ...withoutResources } = baseInput;
      await service.create(withoutResources as any, staffUser);
      expect(prisma.appointmentResources.createMany).not.toHaveBeenCalled();
    });
  });

  describe('transitionStatus — frees attached resources on cancel/no_show (REQ017)', () => {
    it('deletes AppointmentResources rows when an appointment is cancelled', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointmentRow);
      await service.cancel('appt-1', 'patient request', staffUser);
      expect(prisma.appointmentResources.deleteMany).toHaveBeenCalledWith({ where: { appointment_id: 'appt-1' } });
    });

    it('deletes AppointmentResources rows when an appointment is marked no_show', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointmentRow);
      await service.markNoShow('appt-1', staffUser);
      expect(prisma.appointmentResources.deleteMany).toHaveBeenCalledWith({ where: { appointment_id: 'appt-1' } });
    });

    it('does not touch AppointmentResources on an unrelated transition (e.g. completing)', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointmentRow);
      await service.complete('appt-1', staffUser);
      expect(prisma.appointmentResources.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('findAll — clinic_id filter (REQ042)', () => {
    it('scopes to a single clinic when clinic_id is provided', async () => {
      await service.findAll({ clinic_id: 'clinic-a' } as any, 20, 1, staffUser);
      const where = prisma.appointments.findMany.mock.calls[0][0].where;
      expect(where.clinic_id).toBe('clinic-a');
    });

    it('omits the clinic filter entirely when not provided', async () => {
      await service.findAll(undefined, 20, 1, staffUser);
      const where = prisma.appointments.findMany.mock.calls[0][0].where;
      expect(where.clinic_id).toBeUndefined();
    });
  });

  // BUG019: date_from/date_to construction had zero coverage even though the
  // frontend fix (calendar + appointments list date-window wiring) depends
  // entirely on this existing behavior working as documented.
  describe('findAll — date_from/date_to filter (BUG019)', () => {
    it('date_from alone sets a lower bound only', async () => {
      await service.findAll({ date_from: '2026-08-01' } as any, 20, 1, staffUser);
      const where = prisma.appointments.findMany.mock.calls[0][0].where;
      expect(where.appointment_time.gte).toEqual(new Date('2026-08-01'));
      expect(where.appointment_time.lte).toBeUndefined();
    });

    it('date_to alone sets an inclusive end-of-day upper bound only', async () => {
      await service.findAll({ date_to: '2026-08-23' } as any, 20, 1, staffUser);
      const where = prisma.appointments.findMany.mock.calls[0][0].where;
      expect(where.appointment_time.lte).toEqual(new Date('2026-08-23T23:59:59.999Z'));
      expect(where.appointment_time.gte).toBeUndefined();
    });

    it('date_from and date_to together set both bounds', async () => {
      await service.findAll({ date_from: '2026-08-01', date_to: '2026-08-23' } as any, 20, 1, staffUser);
      const where = prisma.appointments.findMany.mock.calls[0][0].where;
      expect(where.appointment_time.gte).toEqual(new Date('2026-08-01'));
      expect(where.appointment_time.lte).toEqual(new Date('2026-08-23T23:59:59.999Z'));
    });

    it('omits any date bound when neither is provided — no implicit default window', async () => {
      await service.findAll(undefined, 20, 1, staffUser);
      const where = prisma.appointments.findMany.mock.calls[0][0].where;
      expect(where.appointment_time).toBeUndefined();
    });

    it('orders results by appointment_time descending, unconditionally', async () => {
      await service.findAll(undefined, 20, 1, staffUser);
      const args = prisma.appointments.findMany.mock.calls[0][0];
      expect(args.orderBy).toEqual({ appointment_time: 'desc' });
    });
  });
});
