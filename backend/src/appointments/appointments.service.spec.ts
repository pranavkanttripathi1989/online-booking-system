import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { PUB_SUB } from '../common/pubsub.provider';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { QueueService } from '../queue/queue.service';
import { PatientsService } from '../patients/patients.service';
import { WebhookDispatchService } from '../webhooks/webhook-dispatch.service';
import { IntakeFieldsService } from '../intake-fields/intake-fields.service';
import { WaitlistService } from '../waitlist/waitlist.service';
import { BranchOverridesService } from '../branch-overrides/branch-overrides.service';
import { SlotHoldsService } from '../slot-holds/slot-holds.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Security regression coverage: appointments() previously only org-scoped,
// never self-scoped -- any authenticated 'patient' role account could read
// every appointment (reason, notes, other patients' names) within the org.
describe('AppointmentsService — access scoping', () => {
  let service: AppointmentsService;
  let prisma: {
    appointments: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
    encounters: { findUnique: jest.Mock };
    appointmentStatusLogs: { findMany: jest.Mock; create: jest.Mock };
    clinics: { findUnique: jest.Mock };
    clinicians: { findUnique: jest.Mock };
    products: { findUnique: jest.Mock };
    patients: { findUnique: jest.Mock };
    rooms: { findFirst: jest.Mock; findUnique: jest.Mock; findMany: jest.Mock };
    userProfiles: { findFirst: jest.Mock };
    clinicianAvailability: { findFirst: jest.Mock };
    resources: { count: jest.Mock };
    appointmentResources: { findFirst: jest.Mock; createMany: jest.Mock; deleteMany: jest.Mock; updateMany: jest.Mock };
    appointmentIdempotencyKeys: { findUnique: jest.Mock; create: jest.Mock };
    $executeRawUnsafe: jest.Mock;
    $transaction: jest.Mock;
  };
  let notificationTrigger: { dispatch: jest.Mock };
  let patientsService: { ownAndDependantPatientIds: jest.Mock };
  let webhookDispatch: { fireEvent: jest.Mock };
  let intakeFieldsService: { forBooking: jest.Mock };
  let waitlistService: { promoteNext: jest.Mock };
  let queueService: { syncFromAppointmentStatus: jest.Mock; publish: jest.Mock };
  let branchOverridesService: { getManyForPricing: jest.Mock };
  let slotHoldsService: { holdSlot: jest.Mock; releaseSlot: jest.Mock; consumeIfOwned: jest.Mock };

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
      encounters: { findUnique: jest.fn() },
      appointmentStatusLogs: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
      clinics: { findUnique: jest.fn().mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1', client_organization: { no_show_prepayment_threshold: 3 } }) },
      clinicians: { findUnique: jest.fn() },
      products: { findUnique: jest.fn().mockResolvedValue({ id: 'svc-1', duration_minutes: 30, prepayment_policy: 'none' }) },
      // REQ052: create() now also checks the caller's own no-show history.
      patients: { findUnique: jest.fn().mockResolvedValue({ id: 'pat-1', no_show_count: 0 }) },
      // REQ124: findMany drives findFreeRoom() for slot-mode bookings now --
      // defaults to a single free room so every pre-existing slot-mode
      // create() test keeps assigning 'room-1' unchanged.
      rooms: { findFirst: jest.fn().mockResolvedValue({ id: 'room-1' }), findUnique: jest.fn().mockResolvedValue({ id: 'room-1' }), findMany: jest.fn().mockResolvedValue([{ id: 'room-1' }]) },
      userProfiles: { findFirst: jest.fn().mockResolvedValue(null) },
      // REQ017: default to "no session/hybrid window" so every pre-existing
      // slot-mode test in this file keeps exercising slot mode unchanged.
      clinicianAvailability: { findFirst: jest.fn().mockResolvedValue(null) },
      resources: { count: jest.fn().mockResolvedValue(0) },
      appointmentResources: { findFirst: jest.fn().mockResolvedValue(null), createMany: jest.fn(), deleteMany: jest.fn(), updateMany: jest.fn() },
      // P1-05: BOOK-3's idempotency-key no-op check/write. Defaults to "no
      // key on file" so every pre-existing create() test in this file (none
      // of which pass idempotency_key) is unaffected.
      appointmentIdempotencyKeys: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
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
        // REQ019: transitionStatus() now syncs a QueueEntries row inside its
        // own transaction -- mocked no-op here, exercised for real in
        // queue.service.spec.ts instead.
        { provide: QueueService, useValue: (queueService = { syncFromAppointmentStatus: jest.fn(), publish: jest.fn() }) },
        // REQ018: create() now validates a patient caller's input.patient_id
        // against their own-or-dependant id set -- mocked to always allow
        // 'pat-1' (every existing patient-role test case in this file uses
        // that id) here, exercised for real in patients.service.spec.ts.
        { provide: PatientsService, useValue: (patientsService = { ownAndDependantPatientIds: jest.fn().mockResolvedValue(['pat-1']) }) },
        // REQ030: fireEvent is best-effort/fire-and-forget -- mocked no-op
        // here, exercised for real in webhook-dispatch.service.spec.ts.
        { provide: WebhookDispatchService, useValue: (webhookDispatch = { fireEvent: jest.fn() }) },
        // REQ052: create() now checks required intake fields -- mocked to
        // "no fields configured" here (every existing test in this file
        // predates intake fields), exercised for real in
        // intake-fields.service.spec.ts and the dedicated describe block below.
        { provide: IntakeFieldsService, useValue: (intakeFieldsService = { forBooking: jest.fn().mockResolvedValue([]) }) },
        // REQ106: transitionStatus() now promotes the next waitlist entry on
        // cancel/no_show -- mocked no-op here, exercised for real in
        // waitlist.service.spec.ts and the dedicated describe block below.
        { provide: WaitlistService, useValue: (waitlistService = { promoteNext: jest.fn() }) },
        // REQ140: findAll() now batch-prefetches branch overrides for the
        // list-preview price -- defaults to "no overrides found" (an empty
        // Map, same meaning getManyForPricing's own real "no matching row"
        // case has) so every pre-existing test in this file keeps pricing
        // straight from the product/patient-category as before this slice.
        { provide: BranchOverridesService, useValue: (branchOverridesService = { getManyForPricing: jest.fn().mockResolvedValue(new Map()) }) },
        // P1-05: holdSlot()/releaseSlot() are thin passthroughs, exercised
        // for real in slot-holds.service.spec.ts; create()'s own use of
        // consumeIfOwned is a no-op default here (matches every
        // pre-existing test, none of which pass hold_token).
        {
          provide: SlotHoldsService,
          useValue: (slotHoldsService = { holdSlot: jest.fn(), releaseSlot: jest.fn(), consumeIfOwned: jest.fn() }),
        },
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

    // REQ140 (REQ055's own named follow-up) — the list-preview price now
    // applies a branch override, batch-prefetched in one query.
    describe('branch-override batch prefetch', () => {
      it('de-duplicates repeated (product_id, clinic_id) pairs across rows into one batch call, and applies the resolved override to each row\'s price', async () => {
        const product = { id: 'svc-1', name: 'GP Consult', price: 50000 };
        const rowA = { ...baseAppointmentRow, id: 'appt-a', product_id: 'svc-1', clinic_id: 'clinic-1', product };
        const rowB = { ...baseAppointmentRow, id: 'appt-b', product_id: 'svc-1', clinic_id: 'clinic-1', product };
        prisma.appointments.findMany.mockResolvedValue([rowA, rowB]);
        prisma.appointments.count.mockResolvedValue(2);
        branchOverridesService.getManyForPricing.mockResolvedValue(
          new Map([['svc-1:clinic-1', { mode: 'override', override_price: 40000 }]]),
        );

        const result = await service.findAll(undefined, 20, 1, staffUser);

        expect(branchOverridesService.getManyForPricing).toHaveBeenCalledWith([
          { productId: 'svc-1', clinicId: 'clinic-1' },
          { productId: 'svc-1', clinicId: 'clinic-1' },
        ]);
        expect(result.data[0]!.service!.price).toBe(400);
        expect(result.data[1]!.service!.price).toBe(400);
      });

      it('excludes rows with no product from the batch-prefetch pairs', async () => {
        const rowNoProduct = { ...baseAppointmentRow, id: 'appt-c', product_id: null, clinic_id: 'clinic-1', product: null };
        prisma.appointments.findMany.mockResolvedValue([rowNoProduct]);
        prisma.appointments.count.mockResolvedValue(1);

        await service.findAll(undefined, 20, 1, staffUser);

        expect(branchOverridesService.getManyForPricing).toHaveBeenCalledWith([]);
      });

      it('a row whose pair has no override in the batch map prices straight from the product (unchanged behaviour)', async () => {
        const product = { id: 'svc-1', name: 'GP Consult', price: 50000 };
        const row = { ...baseAppointmentRow, id: 'appt-a', product_id: 'svc-1', clinic_id: 'clinic-1', product };
        prisma.appointments.findMany.mockResolvedValue([row]);
        prisma.appointments.count.mockResolvedValue(1);
        branchOverridesService.getManyForPricing.mockResolvedValue(new Map());

        const result = await service.findAll(undefined, 20, 1, staffUser);
        expect(result.data[0]!.service!.price).toBe(500);
      });
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

    // REQ026 (US-TEL-07) — "advise in-person visit" escalation. Hard Rule
    // 6: a client-supplied cross-domain id (escalated_from_encounter_id)
    // is validated against the caller, never trusted alone.
    describe('escalated_from_encounter_id (REQ026)', () => {
      it('links the new appointment when the caller is that encounter\'s own treating clinician', async () => {
        prisma.encounters.findUnique.mockResolvedValue({ id: 'enc-1', client_org_id: 'org-1', clinician_id: 'cln-1' });
        await service.create({ ...baseInput, escalated_from_encounter_id: 'enc-1' } as any, clinicianUser);
        expect(prisma.appointments.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ escalated_from_encounter_id: 'enc-1' }) }),
        );
      });

      it('rejects when the caller is a different clinician than the encounter\'s own', async () => {
        prisma.encounters.findUnique.mockResolvedValue({ id: 'enc-1', client_org_id: 'org-1', clinician_id: 'cln-other' });
        await expect(service.create({ ...baseInput, escalated_from_encounter_id: 'enc-1' } as any, clinicianUser)).rejects.toThrow(
          'Originating encounter not found',
        );
        expect(prisma.appointments.create).not.toHaveBeenCalled();
      });

      it('rejects a cross-org encounter id, same as a nonexistent one', async () => {
        prisma.encounters.findUnique.mockResolvedValue({ id: 'enc-1', client_org_id: 'org-2', clinician_id: 'cln-1' });
        await expect(service.create({ ...baseInput, escalated_from_encounter_id: 'enc-1' } as any, clinicianUser)).rejects.toThrow(
          'Originating encounter not found',
        );
      });

      it('rejects a nonexistent encounter id outright', async () => {
        prisma.encounters.findUnique.mockResolvedValue(null);
        await expect(service.create({ ...baseInput, escalated_from_encounter_id: 'bad-id' } as any, clinicianUser)).rejects.toThrow(
          'Originating encounter not found',
        );
      });

      it('never looks up an encounter at all when the field is omitted (every pre-existing booking)', async () => {
        await service.create(baseInput as any, staffUser);
        expect(prisma.encounters.findUnique).not.toHaveBeenCalled();
      });
    });

    // REQ124 (context/open-questions.md #14) — room assignment retries the
    // next active room instead of only ever trying the first one.
    describe('room assignment (REQ124)', () => {
      beforeEach(() => {
        prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
        prisma.rooms.findMany.mockResolvedValue([{ id: 'room-1' }, { id: 'room-2' }]);
      });

      it('assigns the first active room when it is free', async () => {
        // clinician free, room-1 free
        prisma.appointments.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
        await service.create(baseInput as any, staffUser);
        expect(prisma.appointments.create).toHaveBeenCalledWith(expect.objectContaining({
          data: expect.objectContaining({ room_id: 'room-1' }),
        }));
      });

      it('tries the next active room when the first is busy, instead of rejecting the whole booking', async () => {
        prisma.appointments.findFirst
          .mockResolvedValueOnce(null) // clinician free
          .mockResolvedValueOnce({ appointment_time: new Date(baseInput.start_datetime), duration_minutes: 30 }) // room-1 busy, overlaps
          .mockResolvedValueOnce(null); // room-2 free
        await service.create(baseInput as any, staffUser);
        expect(prisma.appointments.create).toHaveBeenCalledWith(expect.objectContaining({
          data: expect.objectContaining({ room_id: 'room-2' }),
        }));
      });

      it('rejects with a distinct message when every active room is busy', async () => {
        prisma.appointments.findFirst
          .mockResolvedValueOnce(null) // clinician free
          .mockResolvedValueOnce({ appointment_time: new Date(baseInput.start_datetime), duration_minutes: 30 }) // room-1 busy
          .mockResolvedValueOnce({ appointment_time: new Date(baseInput.start_datetime), duration_minutes: 30 }); // room-2 busy
        await expect(service.create(baseInput as any, staffUser)).rejects.toThrow('No room is free at this time');
      });

      it('rejects with the original message when the clinic has no active rooms at all', async () => {
        prisma.appointments.findFirst.mockResolvedValueOnce(null); // clinician free
        prisma.rooms.findMany.mockResolvedValue([]);
        prisma.rooms.findFirst.mockResolvedValue(null);
        await expect(service.create(baseInput as any, staffUser)).rejects.toThrow('No active room available at this clinic');
      });
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

    it('skips the org-ownership check for an org-less caller (patient self-serve booking goes through a separate mutation)', async () => {
      // REQ052: clinics.findUnique now always runs (it also resolves the
      // no-show-prepayment threshold, needed regardless of caller org) —
      // the real guarantee this test cares about is that an org-less
      // caller is never rejected for a clinic-ownership mismatch, not that
      // the lookup itself never happens.
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-2' });
      const orgLessPatient: JwtPayload = { sub: 'p-1', roles: ['patient'], client_org_id: null, patient_id: 'pat-1' } as JwtPayload;
      await expect(service.create(baseInput as any, orgLessPatient)).resolves.toBeDefined();
    });

    // REQ018 (US-BOOK-03).
    describe('prepayment policy', () => {
      it('creates with status "scheduled" when the service has no prepayment requirement (default)', async () => {
        await service.create(baseInput as any, staffUser);
        const created = prisma.appointments.create.mock.calls[0][0].data;
        expect(created.status).toBe('scheduled');
      });

      it('creates with status "awaiting_payment" when the service requires prepayment', async () => {
        prisma.products.findUnique.mockResolvedValue({ id: 'svc-1', duration_minutes: 30, prepayment_policy: 'required' });
        await service.create(baseInput as any, staffUser);
        const created = prisma.appointments.create.mock.calls[0][0].data;
        expect(created.status).toBe('awaiting_payment');
      });

      it('logs the same initial status on AppointmentStatusLogs as the appointment itself', async () => {
        prisma.products.findUnique.mockResolvedValue({ id: 'svc-1', duration_minutes: 30, prepayment_policy: 'required' });
        await service.create(baseInput as any, staffUser);
        expect(prisma.appointmentStatusLogs.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ status: 'awaiting_payment' }) }),
        );
      });
    });

    // REQ052 (US-BOOK-04) — repeat-no-show patients forced into prepayment.
    describe('repeat-no-show prepayment override', () => {
      it('forces awaiting_payment once no_show_count reaches the org threshold, even for a policy-free service', async () => {
        prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', no_show_count: 3 });
        await service.create(baseInput as any, staffUser);
        const created = prisma.appointments.create.mock.calls[0][0].data;
        expect(created.status).toBe('awaiting_payment');
      });

      it('does not force prepayment below the threshold', async () => {
        prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', no_show_count: 2 });
        await service.create(baseInput as any, staffUser);
        const created = prisma.appointments.create.mock.calls[0][0].data;
        expect(created.status).toBe('scheduled');
      });

      it('respects a per-org configured threshold, not a hardcoded one', async () => {
        prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1', client_organization: { no_show_prepayment_threshold: 1 } });
        prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', no_show_count: 1 });
        await service.create(baseInput as any, staffUser);
        const created = prisma.appointments.create.mock.calls[0][0].data;
        expect(created.status).toBe('awaiting_payment');
      });

      // P1-17 — the flat threshold is now one input into a real risk
      // score joining lead time and booking channel, not the sole trigger.
      it('a self-booked, far-out booking can be forced into prepayment even below the raw no-show count threshold', async () => {
        prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', no_show_count: 2 }); // below the threshold of 3 alone
        const farOutInput = { ...baseInput, start_datetime: new Date(Date.now() + 20 * 86_400_000).toISOString() };
        await service.create(farOutInput as any, patientUser);
        const created = prisma.appointments.create.mock.calls[0][0].data;
        expect(created.status).toBe('awaiting_payment');
      });

      it('a clean-history, staff-booked appointment is never forced into prepayment regardless of lead time', async () => {
        prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', no_show_count: 0 });
        const farOutInput = { ...baseInput, start_datetime: new Date(Date.now() + 60 * 86_400_000).toISOString() };
        await service.create(farOutInput as any, staffUser);
        const created = prisma.appointments.create.mock.calls[0][0].data;
        expect(created.status).toBe('scheduled');
      });
    });

    // REQ052 (US-BOOK-06) — configurable intake fields.
    describe('intake fields', () => {
      it('stores submitted intake responses as the appointment\'s intake_responses JSON', async () => {
        const input = { ...baseInput, intake_responses: [{ key: 'current_medications', value: 'None' }] };
        await service.create(input as any, staffUser);
        const created = prisma.appointments.create.mock.calls[0][0].data;
        expect(created.intake_responses).toEqual({ current_medications: 'None' });
      });

      it('rejects when a required field for this clinic/service is not answered', async () => {
        intakeFieldsService.forBooking.mockResolvedValue([
          { key: 'current_medications', label: 'Current medications', is_required: true },
        ]);
        await expect(service.create(baseInput as any, staffUser)).rejects.toThrow(/Missing required field/i);
        expect(prisma.appointments.create).not.toHaveBeenCalled();
      });

      it('accepts when every required field is answered', async () => {
        intakeFieldsService.forBooking.mockResolvedValue([
          { key: 'current_medications', label: 'Current medications', is_required: true },
        ]);
        const input = { ...baseInput, intake_responses: [{ key: 'current_medications', value: 'Ibuprofen' }] };
        await expect(service.create(input as any, staffUser)).resolves.toBeDefined();
      });

      it('does not require an optional field to be answered', async () => {
        intakeFieldsService.forBooking.mockResolvedValue([
          { key: 'referral_source', label: 'Referral source', is_required: false },
        ]);
        await expect(service.create(baseInput as any, staffUser)).resolves.toBeDefined();
      });
    });

    // REQ030 (US-INT-02, scoped down).
    it('fires an appointment.created webhook event for the booking clinic\'s org', async () => {
      await service.create(baseInput as any, staffUser);
      expect(webhookDispatch.fireEvent).toHaveBeenCalledWith('org-1', 'appointment.created', expect.objectContaining({ appointment_id: 'appt-new' }));
    });

    // REQ018 -- found while building family/dependant profiles: a
    // 'patient'-role caller could previously book under ANY patient_id.
    describe('patient-role caller — own-or-dependant patient_id validation (REQ018)', () => {
      it('rejects booking for a patient_id that is neither the caller\'s own nor a dependant\'s', async () => {
        prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
        patientsService.ownAndDependantPatientIds.mockResolvedValue(['pat-1']);
        const otherPatientInput = { ...baseInput, patient_id: 'pat-999' };
        await expect(service.create(otherPatientInput as any, patientUser)).rejects.toThrow('Patient not found');
        expect(prisma.products.findUnique).not.toHaveBeenCalled();
      });

      it('allows booking for a genuine dependant\'s patient_id', async () => {
        prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
        patientsService.ownAndDependantPatientIds.mockResolvedValue(['pat-1', 'dep-1']);
        const dependantInput = { ...baseInput, patient_id: 'dep-1' };
        await expect(service.create(dependantInput as any, patientUser)).resolves.toBeDefined();
      });
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

    // P1-05 (BOOK-3, BOOK-2)
    describe('idempotency key & slot hold', () => {
      const existingAppointmentRow = {
        id: 'appt-existing', patient_id: 'pat-1', clinician_id: 'cln-1', clinic: { client_org_id: 'org-1' },
        patient: { id: 'pat-1', first_name: 'A', last_name: 'B', date_of_birth: new Date() },
        clinician: { id: 'cln-1', first_name: 'X', last_name: 'Y' }, room: {}, appointment_time: new Date(), duration_minutes: 30, status: 'scheduled',
      };

      it('short-circuits to the original appointment on a repeat idempotency_key, without re-running any validation', async () => {
        prisma.appointmentIdempotencyKeys.findUnique.mockResolvedValueOnce({
          idempotency_key: 'key-1', appointment_id: 'appt-existing', appointment: existingAppointmentRow,
        });
        const result = await service.create({ ...baseInput, idempotency_key: 'key-1' } as any, staffUser);
        expect(result.id).toBe('appt-existing');
        expect(prisma.clinics.findUnique).not.toHaveBeenCalled();
        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('writes the idempotency key row inside the same transaction as a first-time successful create', async () => {
        prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
        await service.create({ ...baseInput, idempotency_key: 'key-2' } as any, staffUser);
        expect(prisma.appointmentIdempotencyKeys.create).toHaveBeenCalledWith({
          data: { idempotency_key: 'key-2', appointment_id: 'appt-new' },
        });
      });

      it('never writes a key row when none was supplied (unchanged, pre-existing behaviour)', async () => {
        prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
        await service.create(baseInput as any, staffUser);
        expect(prisma.appointmentIdempotencyKeys.create).not.toHaveBeenCalled();
      });

      it('a genuinely concurrent duplicate key submit returns the winner\'s appointment instead of throwing', async () => {
        prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
        prisma.appointmentIdempotencyKeys.findUnique
          .mockResolvedValueOnce(null) // pre-check: no key on file yet
          .mockResolvedValueOnce({ idempotency_key: 'key-3', appointment_id: 'appt-existing', appointment: existingAppointmentRow }); // post-catch: the winner
        prisma.$transaction.mockRejectedValueOnce(
          new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' }),
        );
        const result = await service.create({ ...baseInput, idempotency_key: 'key-3' } as any, staffUser);
        expect(result.id).toBe('appt-existing');
      });

      it('consumes the hold that led to a successful booking', async () => {
        prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
        await service.create({ ...baseInput, hold_token: 'hold-1' } as any, staffUser);
        expect(slotHoldsService.consumeIfOwned).toHaveBeenCalledWith('cln-1', expect.any(String), 'hold-1');
      });

      it('never touches the hold service when no hold_token was supplied (unchanged, pre-existing behaviour)', async () => {
        prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
        await service.create(baseInput as any, staffUser);
        expect(slotHoldsService.consumeIfOwned).not.toHaveBeenCalled();
      });
    });

    // Real bug caught here before it shipped: SlotHoldsService returns
    // camelCase (holdToken/expiresAt), but SlotHoldType is snake_case
    // (matching this dialect's own convention) — GraphQL's code-first
    // resolver can't match a property by a different name, so returning the
    // service's own shape unmapped surfaced live as "Cannot return null for
    // non-nullable field SlotHoldType.hold_token" the first time this was
    // exercised through a real HTTP round trip, not the mocked-Prisma suite.
    describe('holdSlot / releaseSlot (resolver-facing shape)', () => {
      it('maps SlotHoldsService\'s camelCase result to SlotHoldType\'s own snake_case fields', async () => {
        const expiresAt = new Date();
        slotHoldsService.holdSlot.mockResolvedValue({ holdToken: 'tok-1', expiresAt });
        const result = await service.holdSlot('cln-1', '2026-10-15T09:00:00.000Z');
        expect(result).toEqual({ hold_token: 'tok-1', expires_at: expiresAt });
      });

      it('releaseSlot always resolves true and passes through to SlotHoldsService', async () => {
        const result = await service.releaseSlot('cln-1', '2026-10-15T09:00:00.000Z', 'tok-1');
        expect(slotHoldsService.releaseSlot).toHaveBeenCalledWith('cln-1', new Date('2026-10-15T09:00:00.000Z').toISOString(), 'tok-1');
        expect(result).toBe(true);
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

    // P1-17 — computed fresh from the patient's current no_show_count on
    // every read, not a stored column.
    it('exposes a real no_show_risk computed from the patient\'s current history', async () => {
      prisma.appointments.findUnique.mockResolvedValue(
        baseAppointment({
          created_at: new Date(),
          booked_by_user_id: null,
          patient: { id: 'pat-1', first_name: 'A', last_name: 'B', date_of_birth: new Date(), no_show_count: 5 },
          clinic: { client_org_id: 'org-1', client_organization: { no_show_prepayment_threshold: 3 } },
        }),
      );
      const result = await service.findOne('appt-1', clinicianUser);
      expect(result.no_show_risk.level).toBe('high');
      expect(result.no_show_risk.reasons).toContain('5 prior no-shows');
    });

    // REQ016 (US-CAT-04) — display-mapping call site, reads through the
    // shared resolveServicePrice() helper (no channel — the payment channel
    // isn't known yet at display time, see resolveServicePrice()'s own
    // comment), never a.product.price directly.
    it('shows the patient-category-adjusted price on the appointment\'s linked service', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointment({
        product: { id: 'prod-1', name: 'Consultation', price: 50000, category_pricing_json: { corporate: 35000 } },
        patient: { id: 'pat-1', first_name: 'A', last_name: 'B', date_of_birth: new Date(), patient_category: 'corporate' },
      }));
      const result = await service.findOne('appt-1', clinicianUser);
      expect(result.service?.price).toBe(350); // 35000 paise -> rupees
    });

    it('shows the base price when the patient has no matching category override', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointment({
        product: { id: 'prod-1', name: 'Consultation', price: 50000, category_pricing_json: { corporate: 35000 } },
      }));
      const result = await service.findOne('appt-1', clinicianUser);
      expect(result.service?.price).toBe(500); // 50000 paise -> rupees, no override
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

  // REQ107 — token generation on create() for a no-prepayment (immediately
  // 'scheduled') booking.
  describe('create — QR self-check-in token generation (REQ107)', () => {
    const baseInput = { clinician_id: 'cln-1', clinic_id: 'clinic-1', patient_id: 'pat-1', service_id: 'svc-1', start_datetime: new Date().toISOString(), notes: '' };

    it('stores a hash, not the raw token, and returns the raw token in the response', async () => {
      const result = await service.create(baseInput as any, staffUser);
      const created = prisma.appointments.create.mock.calls[0][0].data;
      expect(created.checkin_token_hash).toBeDefined();
      expect(created.checkin_token_hash).not.toBe(result.checkin_token);
      expect(result.checkin_token).toBeDefined();
      expect(typeof result.checkin_token).toBe('string');
    });

    it('sets checkin_token_expires_at to end of the appointment day in IST', async () => {
      await service.create(baseInput as any, staffUser);
      const created = prisma.appointments.create.mock.calls[0][0].data;
      expect(created.checkin_token_expires_at).toBeInstanceOf(Date);
    });

    it('does not generate a token when the service requires prepayment (awaiting_payment)', async () => {
      prisma.products.findUnique.mockResolvedValue({ id: 'svc-1', duration_minutes: 30, prepayment_policy: 'required' });
      const result = await service.create(baseInput as any, staffUser);
      const created = prisma.appointments.create.mock.calls[0][0].data;
      expect(created.checkin_token_hash).toBeUndefined();
      expect(result.checkin_token).toBeUndefined();
    });
  });

  // REQ107 — checkInWithQrToken is @Public(): no JwtPayload at all, only an
  // opaque token. The appointment it resolves to comes entirely from the
  // token's own hash lookup, never a client-supplied id.
  describe('checkInWithQrToken (REQ107)', () => {
    const rawToken = 'a'.repeat(64);
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const checkinAppointmentRow = {
      ...baseAppointmentRow,
      status: 'scheduled',
      checkin_token_hash: tokenHash,
      checkin_token_expires_at: new Date(Date.now() + 60 * 60 * 1000),
      checkin_token_used_at: null,
    };

    it('rejects a syntactically well-formed but never-issued token exactly like "not found"', async () => {
      prisma.appointments.findFirst.mockResolvedValue(null);
      await expect(service.checkInWithQrToken(rawToken)).rejects.toThrow('Invalid check-in code');
      expect(prisma.appointments.update).not.toHaveBeenCalled();
    });

    it('checks in on the happy path and marks the token used, atomically', async () => {
      prisma.appointments.findFirst.mockResolvedValue(checkinAppointmentRow);
      prisma.appointments.update.mockResolvedValue({ ...checkinAppointmentRow, status: 'checked_in' });
      const result = await service.checkInWithQrToken(rawToken);
      expect(result.status).toBe('checked_in');
      expect(prisma.appointments.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'checked_in', checkin_token_used_at: expect.any(Date) }),
      }));
      expect(prisma.appointmentStatusLogs.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'checked_in', changed_by_user_id: null }),
      }));
    });

    it('rejects an already-used token, with a distinct message from "not found"', async () => {
      prisma.appointments.findFirst.mockResolvedValue({ ...checkinAppointmentRow, checkin_token_used_at: new Date() });
      await expect(service.checkInWithQrToken(rawToken)).rejects.toThrow('already been used');
      expect(prisma.appointments.update).not.toHaveBeenCalled();
    });

    it('rejects an expired token, with a distinct message from "already used"', async () => {
      prisma.appointments.findFirst.mockResolvedValue({ ...checkinAppointmentRow, checkin_token_expires_at: new Date(Date.now() - 1000) });
      await expect(service.checkInWithQrToken(rawToken)).rejects.toThrow('expired');
      expect(prisma.appointments.update).not.toHaveBeenCalled();
    });

    it('rejects a token for a cancelled appointment', async () => {
      prisma.appointments.findFirst.mockResolvedValue({ ...checkinAppointmentRow, status: 'cancelled' });
      await expect(service.checkInWithQrToken(rawToken)).rejects.toThrow(/cancelled/);
      expect(prisma.appointments.update).not.toHaveBeenCalled();
    });

    it('rejects a token for an already-completed appointment', async () => {
      prisma.appointments.findFirst.mockResolvedValue({ ...checkinAppointmentRow, status: 'completed' });
      await expect(service.checkInWithQrToken(rawToken)).rejects.toThrow(/completed/);
      expect(prisma.appointments.update).not.toHaveBeenCalled();
    });

    it('rejects a token for a no_show appointment', async () => {
      prisma.appointments.findFirst.mockResolvedValue({ ...checkinAppointmentRow, status: 'no_show' });
      await expect(service.checkInWithQrToken(rawToken)).rejects.toThrow(/no show/);
    });

    it('syncs the queue entry via the same syncFromAppointmentStatus path checkIn() uses', async () => {
      prisma.appointments.findFirst.mockResolvedValue(checkinAppointmentRow);
      prisma.appointments.update.mockResolvedValue({ ...checkinAppointmentRow, status: 'checked_in' });
      await service.checkInWithQrToken(rawToken);
      expect(queueService.syncFromAppointmentStatus).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'checked_in' }), 'checked_in');
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

    // REQ030 (US-INT-02, scoped down).
    it('fires an appointment.cancelled webhook event, but only on an actual cancel, not a completing transition', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointmentRow);
      await service.cancel('appt-1', 'patient request', staffUser);
      expect(webhookDispatch.fireEvent).toHaveBeenCalledWith('org-1', 'appointment.cancelled', expect.objectContaining({ appointment_id: 'appt-1' }));
      webhookDispatch.fireEvent.mockClear();
      await service.complete('appt-1', staffUser);
      expect(webhookDispatch.fireEvent).not.toHaveBeenCalledWith('org-1', 'appointment.cancelled', expect.anything());
    });

    it('does not touch AppointmentResources on an unrelated transition (e.g. completing)', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointmentRow);
      await service.complete('appt-1', staffUser);
      expect(prisma.appointmentResources.deleteMany).not.toHaveBeenCalled();
    });
  });

  // P1-06 — the post-visit review nudge.
  describe('transitionStatus — completed dispatches a new_review notification', () => {
    it("notifies the patient's linked profile with new_review on an actual completion", async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointmentRow);
      prisma.userProfiles.findFirst.mockResolvedValue({ id: 'user-profile-1' });
      await service.complete('appt-1', staffUser);
      expect(prisma.userProfiles.findFirst).toHaveBeenCalledWith({ where: { patient_id: 'pat-1', is_deleted: false } });
      expect(notificationTrigger.dispatch).toHaveBeenCalledWith(
        'user-profile-1',
        'new_review',
        expect.objectContaining({ action_url: expect.stringContaining('appt-1') }),
      );
    });

    it('never fires on a transition other than completing (e.g. cancel)', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointmentRow);
      prisma.userProfiles.findFirst.mockResolvedValue({ id: 'user-profile-1' });
      await service.cancel('appt-1', 'patient request', staffUser);
      expect(notificationTrigger.dispatch).not.toHaveBeenCalledWith('user-profile-1', 'new_review', expect.anything());
    });

    it('never fires when the appointment was already completed (no-op re-transition)', async () => {
      prisma.appointments.findUnique.mockResolvedValue({ ...baseAppointmentRow, status: 'completed' });
      prisma.userProfiles.findFirst.mockResolvedValue({ id: 'user-profile-1' });
      await service.complete('appt-1', staffUser);
      expect(notificationTrigger.dispatch).not.toHaveBeenCalledWith(expect.anything(), 'new_review', expect.anything());
    });

    it('is silently a no-op for a patient with no linked login account (unlinked, matches every other notify path)', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointmentRow);
      prisma.userProfiles.findFirst.mockResolvedValue(null);
      await expect(service.complete('appt-1', staffUser)).resolves.toBeDefined();
      expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
    });
  });

  // REQ106
  describe('transitionStatus — promotes the next waitlist entry on cancel/no_show', () => {
    it('calls waitlistService.promoteNext with the right clinician and UTC-midnight date on cancel', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointmentRow);
      await service.cancel('appt-1', 'patient request', staffUser);
      expect(waitlistService.promoteNext).toHaveBeenCalledWith('cln-1', new Date(baseAppointmentRow.appointment_time.toISOString().slice(0, 10) + 'T00:00:00.000Z'));
    });

    it('calls waitlistService.promoteNext on no_show too', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointmentRow);
      await service.markNoShow('appt-1', staffUser);
      expect(waitlistService.promoteNext).toHaveBeenCalledWith('cln-1', expect.any(Date));
    });

    it('does NOT call promoteNext for an unrelated transition (e.g. completing)', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointmentRow);
      await service.complete('appt-1', staffUser);
      expect(waitlistService.promoteNext).not.toHaveBeenCalled();
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

  // REQ120 — shift a clinician's whole day at once.
  describe('bulkReschedule', () => {
    const clinicianRow = { id: 'cln-1', clinic_id: 'clinic-1', clinic: { client_org_id: 'org-1' } };

    it('rejects a zero shift', async () => {
      await expect(service.bulkReschedule({ clinician_id: 'cln-1', date: '2026-08-26', shift_minutes: 0 } as any, staffUser))
        .rejects.toThrow('shift_minutes must be a non-zero integer');
    });

    it('rejects a cross-org clinician', async () => {
      prisma.clinicians.findUnique.mockResolvedValue({ ...clinicianRow, clinic: { client_org_id: 'org-2' } });
      await expect(service.bulkReschedule({ clinician_id: 'cln-1', date: '2026-08-26', shift_minutes: 30 } as any, staffUser))
        .rejects.toThrow(NotFoundException);
    });

    it('shifts every scheduled/confirmed appointment on the given day by the same delta and reports an honest count', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      const apptA = { id: 'a1', appointment_time: new Date('2026-08-26T09:00:00.000Z'), duration_minutes: 30, booking_mode: 'slot' };
      const apptB = { id: 'a2', appointment_time: new Date('2026-08-26T09:30:00.000Z'), duration_minutes: 30, booking_mode: 'slot' };
      prisma.appointments.findMany.mockResolvedValue([apptA, apptB]);

      const result = await service.bulkReschedule({ clinician_id: 'cln-1', date: '2026-08-26', shift_minutes: 60 } as any, staffUser);

      expect(result).toEqual({ attempted_count: 2, rescheduled_count: 2, failed_count: 0 });
      expect(prisma.appointments.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'a1' },
        data: expect.objectContaining({ appointment_time: new Date('2026-08-26T10:00:00.000Z') }),
      }));
      expect(prisma.appointments.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'a2' },
        data: expect.objectContaining({ appointment_time: new Date('2026-08-26T10:30:00.000Z') }),
      }));
    });

    it('only targets scheduled/confirmed appointments on the given day', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      await service.bulkReschedule({ clinician_id: 'cln-1', date: '2026-08-26', shift_minutes: 30 } as any, staffUser);
      const where = prisma.appointments.findMany.mock.calls[0][0].where;
      expect(where.status).toEqual({ in: ['scheduled', 'confirmed'] });
      expect(where.appointment_time).toEqual({ gte: new Date('2026-08-26T00:00:00.000Z'), lte: new Date('2026-08-26T23:59:59.999Z') });
    });

    it('counts a per-row slot conflict as a failure without aborting the rest of the batch', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      const apptA = { id: 'a1', appointment_time: new Date('2026-08-26T09:00:00.000Z'), duration_minutes: 30, booking_mode: 'slot' };
      const apptB = { id: 'a2', appointment_time: new Date('2026-08-26T09:30:00.000Z'), duration_minutes: 30, booking_mode: 'slot' };
      prisma.appointments.findMany.mockResolvedValue([apptA, apptB]);
      // First row's own conflict check finds a collision; second row's does not.
      prisma.appointments.findFirst
        .mockResolvedValueOnce({ appointment_time: new Date('2026-08-26T10:00:00.000Z'), duration_minutes: 30 })
        .mockResolvedValueOnce(null);

      const result = await service.bulkReschedule({ clinician_id: 'cln-1', date: '2026-08-26', shift_minutes: 60 } as any, staffUser);

      expect(result).toEqual({ attempted_count: 2, rescheduled_count: 1, failed_count: 1 });
    });

    it('skips the slot-conflict check for session/hybrid-mode rows', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      const apptA = { id: 'a1', appointment_time: new Date('2026-08-26T09:00:00.000Z'), duration_minutes: 30, booking_mode: 'session' };
      prisma.appointments.findMany.mockResolvedValue([apptA]);
      await service.bulkReschedule({ clinician_id: 'cln-1', date: '2026-08-26', shift_minutes: 60 } as any, staffUser);
      expect(prisma.appointments.findFirst).not.toHaveBeenCalled();
    });
  });
});
