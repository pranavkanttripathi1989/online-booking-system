import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { QueueService } from './queue.service';
import { PrismaService } from '../prisma/prisma.service';
import { PUB_SUB } from '../common/pubsub.provider';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ChecklistService } from '../checklist/checklist.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';

// REQ019 P0. QueueEntries has no client_org_id of its own — org isolation
// is asserted via clinic.client_org_id (isSameOrg/orgScopeVia), mirroring
// appointments.service.ts's own pattern for the same reason (this is
// runtime state for an Appointment, not a standalone tenant record).
describe('QueueService', () => {
  let service: QueueService;
  let prisma: any;
  let pubSub: { publish: jest.Mock };
  let checklistService: { getIncompleteRequiredItems: jest.Mock };
  let notificationTrigger: { dispatch: jest.Mock };

  const staffA: JwtPayload = { sub: 'staff-a', roles: ['manager'], client_org_id: 'org-a' } as JwtPayload;
  const staffB: JwtPayload = { sub: 'staff-b', roles: ['manager'], client_org_id: 'org-b' } as JwtPayload;
  const clinicianA: JwtPayload = { sub: 'clin-a', roles: ['clinician'], client_org_id: 'org-a', clinician_id: 'cln-a' } as JwtPayload;
  const clinicianOther: JwtPayload = { sub: 'clin-x', roles: ['clinician'], client_org_id: 'org-a', clinician_id: 'cln-x' } as JwtPayload;

  const patient = { first_name: 'Anita', last_name: 'Sharma' };
  const clinicianRow = { id: 'cln-a', first_name: 'Sarah', last_name: 'Mitchell', clinic_id: 'clinic-1', clinic: { client_org_id: 'org-a' } };
  const clinicRow = { id: 'clinic-1', client_org_id: 'org-a' };

  function entry(overrides: any = {}) {
    return {
      id: 'q-1', appointment_id: 'appt-1', clinic_id: 'clinic-1', clinician_id: 'cln-a',
      token_no: 1, status: 'waiting', checked_in_at: new Date('2026-08-24T09:00:00Z'), called_at: null,
      skip_return_after: null, served_since_skip: 0,
      appointment: { patient },
      clinic: clinicRow,
      events: [],
      ...overrides,
    };
  }

  beforeEach(async () => {
    prisma = {
      queueEntries: {
        findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(), create: jest.fn(), delete: jest.fn(),
      },
      queueEvents: { create: jest.fn(), deleteMany: jest.fn() },
      clinicians: { findUnique: jest.fn() },
      clinics: { findUnique: jest.fn() },
      appointments: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
      userProfiles: { findFirst: jest.fn() },
      // Defaults to null (no hybrid window) so every pre-existing test's
      // waiting-list order is untouched by REQ119's interleaving.
      clinicianAvailability: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((cb) => cb(prisma)),
    };
    pubSub = { publish: jest.fn() };
    checklistService = { getIncompleteRequiredItems: jest.fn().mockResolvedValue([]) };
    notificationTrigger = { dispatch: jest.fn().mockResolvedValue(undefined) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: PrismaService, useValue: prisma },
        { provide: PUB_SUB, useValue: pubSub },
        { provide: ChecklistService, useValue: checklistService },
        { provide: NotificationTriggerService, useValue: notificationTrigger },
      ],
    }).compile();
    service = module.get(QueueService);
  });

  describe('queueBoard — tenant isolation and self-scoping', () => {
    it('rejects a cross-org caller', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      await expect(service.queueBoard('cln-a', staffB)).rejects.toThrow(NotFoundException);
    });

    it('rejects a clinician requesting a colleague\'s board', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      await expect(service.queueBoard('cln-a', clinicianOther)).rejects.toThrow(NotFoundException);
    });

    it('returns now-serving, the next-5 waiting, and an average wait computed only from today\'s done entries', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      prisma.queueEntries.findFirst.mockResolvedValue(entry({ id: 'q-serving', status: 'called', called_at: new Date() }));
      // Anchored to Date.now() minus a few hours, not a fixed local-clock
      // date — a fixed date is timezone-ambiguous against the service's
      // local-midnight `todayStart` boundary (see CLAUDE.md's own
      // documented finding on this exact class of fixture bug).
      const todayCheckedIn = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const todayCalled = new Date(todayCheckedIn.getTime() + 10 * 60000);
      prisma.queueEntries.findMany
        .mockResolvedValueOnce([entry({ id: 'q-2' }), entry({ id: 'q-3' })]) // waiting
        .mockResolvedValueOnce([{ checked_in_at: todayCheckedIn, called_at: todayCalled }]); // doneInWindow
      const board = await service.queueBoard('cln-a', staffA);
      expect(board.now_serving?.id).toBe('q-serving');
      expect(board.waiting).toHaveLength(2);
      expect(board.average_wait_minutes).toBe(10);
    });

    // REQ117 (US-QUE-04) — predicted_wait_minutes is a rolling median
    // across the trailing window, distinct from average_wait_minutes'
    // today-only scope; this asserts the two diverge correctly rather
    // than one silently mirroring the other.
    it('computes predicted_wait_minutes as a rolling median across the trailing window, separate from the today-only average', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      prisma.queueEntries.findFirst.mockResolvedValue(null);
      const todayCheckedIn = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const todayCalled = new Date(todayCheckedIn.getTime() + 10 * 60000);
      const pastCheckedIn = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const pastCalled = new Date(pastCheckedIn.getTime() + 20 * 60000);
      prisma.queueEntries.findMany
        .mockResolvedValueOnce([]) // waiting
        .mockResolvedValueOnce([
          { checked_in_at: todayCheckedIn, called_at: todayCalled },
          { checked_in_at: pastCheckedIn, called_at: pastCalled },
        ]); // doneInWindow
      const board = await service.queueBoard('cln-a', staffA);
      expect(board.average_wait_minutes).toBe(10); // today's entry only
      expect(board.predicted_wait_minutes).toBe(15); // median of [10, 20]
    });

    it('leaves predicted_wait_minutes undefined when no completed visits exist in the trailing window', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      prisma.queueEntries.findFirst.mockResolvedValue(null);
      prisma.queueEntries.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      const board = await service.queueBoard('cln-a', staffA);
      expect(board.predicted_wait_minutes).toBeUndefined();
    });
  });

  // REQ119 (REQ017 US-CAL-04 / REQ019 FR-QUE-02)
  describe('queueBoard — hybrid-mode walk-in interleaving', () => {
    it('interleaves walk-ins among booked entries at the configured ratio when a hybrid window applies', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      prisma.queueEntries.findFirst.mockResolvedValue(null);
      prisma.clinicianAvailability.findFirst.mockResolvedValue({ mode: 'hybrid', walkin_ratio: 2 });

      // Booked-in-advance: created days before the appointment's own date.
      const bookedAppt = { patient, created_at: new Date('2026-08-20T08:00:00Z'), appointment_time: new Date('2026-08-24T09:00:00Z') };
      // Walk-in: created the same calendar day as the appointment itself.
      const walkinAppt = { patient, created_at: new Date('2026-08-24T08:55:00Z'), appointment_time: new Date('2026-08-24T09:00:00Z') };

      prisma.queueEntries.findMany
        .mockResolvedValueOnce([
          entry({ id: 'b1', appointment: bookedAppt }),
          entry({ id: 'b2', appointment: bookedAppt }),
          entry({ id: 'w1', appointment: walkinAppt }),
          entry({ id: 'b3', appointment: bookedAppt }),
        ]) // waiting
        .mockResolvedValueOnce([]); // doneInWindow

      const board = await service.queueBoard('cln-a', staffA);
      expect(board.waiting.map((e) => e.id)).toEqual(['b1', 'b2', 'w1', 'b3']);
    });

    it('leaves the pre-existing token_no/checked_in_at order unchanged when no hybrid window applies', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      prisma.queueEntries.findFirst.mockResolvedValue(null);
      prisma.clinicianAvailability.findFirst.mockResolvedValue(null);
      prisma.queueEntries.findMany
        .mockResolvedValueOnce([entry({ id: 'q-a' }), entry({ id: 'q-b' })])
        .mockResolvedValueOnce([]);
      const board = await service.queueBoard('cln-a', staffA);
      expect(board.waiting.map((e) => e.id)).toEqual(['q-a', 'q-b']);
    });

    it('leaves order unchanged for a hybrid window with no walkin_ratio configured', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      prisma.queueEntries.findFirst.mockResolvedValue(null);
      prisma.clinicianAvailability.findFirst.mockResolvedValue({ mode: 'hybrid', walkin_ratio: null });
      prisma.queueEntries.findMany
        .mockResolvedValueOnce([entry({ id: 'q-a' }), entry({ id: 'q-b' })])
        .mockResolvedValueOnce([]);
      const board = await service.queueBoard('cln-a', staffA);
      expect(board.waiting.map((e) => e.id)).toEqual(['q-a', 'q-b']);
    });
  });

  describe('queueEntries — org-wide listing (tenancy matrix)', () => {
    it('scopes to the caller\'s own org via the clinic relation', async () => {
      await service.queueEntries(staffA);
      const where = prisma.queueEntries.findMany.mock.calls[0][0].where;
      expect(where).toEqual(expect.objectContaining({ clinic: { client_org_id: 'org-a' } }));
    });

    it('additionally restricts a clinician caller to their own queue', async () => {
      await service.queueEntries(clinicianA);
      const where = prisma.queueEntries.findMany.mock.calls[0][0].where;
      expect(where.clinician_id).toBe('cln-a');
    });
  });

  describe('clinicQueue — self-scoping', () => {
    it('restricts a clinician caller to only their own queue', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicRow);
      await service.clinicQueue('clinic-1', clinicianA);
      const where = prisma.queueEntries.findMany.mock.calls[0][0].where;
      expect(where.clinician_id).toBe('cln-a');
    });

    it('does not restrict a staff caller by clinician', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicRow);
      await service.clinicQueue('clinic-1', staffA);
      const where = prisma.queueEntries.findMany.mock.calls[0][0].where;
      expect(where.clinician_id).toBeUndefined();
    });
  });

  describe('callNext', () => {
    it('rejects when no one is waiting', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      prisma.queueEntries.findFirst.mockResolvedValue(null);
      await expect(service.callNext('cln-a', staffA)).rejects.toThrow(BadRequestException);
    });

    it('calls the earliest waiting entry, sets called_at, logs the event, and publishes', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      prisma.queueEntries.findFirst.mockResolvedValue(entry());
      prisma.queueEntries.update.mockResolvedValue(entry({ status: 'called', called_at: new Date() }));
      const result = await service.callNext('cln-a', staffA);
      expect(prisma.queueEntries.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'q-1' }, data: expect.objectContaining({ status: 'called' }),
      }));
      expect(prisma.queueEvents.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: 'called' }),
      }));
      expect(pubSub.publish).toHaveBeenCalled();
      expect(result.status).toBe('called');
    });

    it('orders by token_no then checked_in_at', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      prisma.queueEntries.findFirst.mockResolvedValue(null);
      await expect(service.callNext('cln-a', staffA)).rejects.toThrow();
      expect(prisma.queueEntries.findFirst.mock.calls[0][0].orderBy).toEqual([{ token_no: 'asc' }, { checked_in_at: 'asc' }]);
    });

    // REQ051 (US-QUE-06)
    it('rejects when a required checklist item is incomplete, naming it', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      prisma.queueEntries.findFirst.mockResolvedValue(entry());
      checklistService.getIncompleteRequiredItems.mockResolvedValue(['Consent form']);
      await expect(service.callNext('cln-a', staffA)).rejects.toThrow(BadRequestException);
      await expect(service.callNext('cln-a', staffA)).rejects.toThrow(/Consent form/);
      expect(checklistService.getIncompleteRequiredItems).toHaveBeenCalledWith('appt-1');
      expect(prisma.queueEntries.update).not.toHaveBeenCalled();
    });

    it('proceeds when the checklist is complete (or none configured)', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      prisma.queueEntries.findFirst.mockResolvedValue(entry());
      prisma.queueEntries.update.mockResolvedValue(entry({ status: 'called', called_at: new Date() }));
      checklistService.getIncompleteRequiredItems.mockResolvedValue([]);
      const result = await service.callNext('cln-a', staffA);
      expect(result.status).toBe('called');
    });
  });

  describe('recall', () => {
    it('rejects a cross-org queue entry', async () => {
      prisma.queueEntries.findUnique.mockResolvedValue(entry({ clinic: { client_org_id: 'org-b' } }));
      await expect(service.recall('q-1', staffA)).rejects.toThrow(NotFoundException);
    });

    it('rejects recalling an entry already waiting', async () => {
      prisma.queueEntries.findUnique.mockResolvedValue(entry({ status: 'waiting' }));
      await expect(service.recall('q-1', staffA)).rejects.toThrow(BadRequestException);
    });

    it('rejects recalling a done or no_show entry', async () => {
      prisma.queueEntries.findUnique.mockResolvedValue(entry({ status: 'done' }));
      await expect(service.recall('q-1', staffA)).rejects.toThrow(BadRequestException);
    });

    it('brings a skipped entry back to waiting and clears its skip state', async () => {
      prisma.queueEntries.findUnique.mockResolvedValue(entry({ status: 'skipped', skip_return_after: 3, served_since_skip: 2 }));
      prisma.queueEntries.update.mockResolvedValue(entry({ status: 'waiting' }));
      await service.recall('q-1', staffA);
      expect(prisma.queueEntries.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { status: 'waiting', called_at: null, skip_return_after: null, served_since_skip: 0 },
      }));
      expect(prisma.queueEvents.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: 'recalled' }),
      }));
    });
  });

  describe('skip', () => {
    it('rejects skipping an already-completed visit', async () => {
      prisma.queueEntries.findUnique.mockResolvedValue(entry({ status: 'done' }));
      await expect(service.skip({ queue_entry_id: 'q-1' } as any, staffA)).rejects.toThrow(BadRequestException);
    });

    it('defaults return_after to 3 when not supplied', async () => {
      prisma.queueEntries.findUnique.mockResolvedValue(entry({ status: 'called' }));
      prisma.queueEntries.update.mockResolvedValue(entry({ status: 'skipped' }));
      await service.skip({ queue_entry_id: 'q-1' } as any, staffA);
      expect(prisma.queueEntries.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'skipped', skip_return_after: 3, served_since_skip: 0 }),
      }));
    });

    it('honours an explicit return_after and records the reason', async () => {
      prisma.queueEntries.findUnique.mockResolvedValue(entry({ status: 'waiting' }));
      prisma.queueEntries.update.mockResolvedValue(entry({ status: 'skipped' }));
      await service.skip({ queue_entry_id: 'q-1', return_after: 5, reason: 'gone to pharmacy' } as any, staffA);
      expect(prisma.queueEntries.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ skip_return_after: 5 }),
      }));
      expect(prisma.queueEvents.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ reason: 'gone to pharmacy' }),
      }));
    });
  });

  describe('transfer', () => {
    it('rejects a target clinician not at the same clinic', async () => {
      prisma.queueEntries.findUnique.mockResolvedValue(entry());
      prisma.clinicians.findUnique.mockResolvedValue({ id: 'cln-y', clinic_id: 'clinic-2' });
      await expect(service.transfer({ queue_entry_id: 'q-1', target_clinician_id: 'cln-y' } as any, staffA))
        .rejects.toThrow(BadRequestException);
    });

    it('reassigns both the appointment and the queue entry, resets token/called_at, and returns to waiting', async () => {
      prisma.queueEntries.findUnique.mockResolvedValue(entry({ status: 'called', called_at: new Date() }));
      prisma.clinicians.findUnique.mockResolvedValue({ id: 'cln-y', clinic_id: 'clinic-1', first_name: 'Raj', last_name: 'Verma' });
      prisma.queueEntries.update.mockResolvedValue(entry({ clinician_id: 'cln-y', status: 'waiting', token_no: null }));
      await service.transfer({ queue_entry_id: 'q-1', target_clinician_id: 'cln-y' } as any, staffA);
      expect(prisma.appointments.update).toHaveBeenCalledWith({ where: { id: 'appt-1' }, data: { clinician_id: 'cln-y' } });
      expect(prisma.queueEntries.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { clinician_id: 'cln-y', status: 'waiting', called_at: null, token_no: null },
      }));
    });
  });

  // REQ118 (US-QUE-06)
  describe('broadcastDelay', () => {
    it('rejects a non-positive delay', async () => {
      await expect(service.broadcastDelay('cln-a', 0, staffA)).rejects.toThrow(BadRequestException);
      await expect(service.broadcastDelay('cln-a', -5, staffA)).rejects.toThrow(BadRequestException);
    });

    it('rejects a cross-org caller', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      await expect(service.broadcastDelay('cln-a', 10, staffB)).rejects.toThrow(NotFoundException);
    });

    it('notifies only the linked accounts among currently-waiting patients, skipping unlinked ones honestly', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      prisma.queueEntries.findMany.mockResolvedValue([
        entry({ id: 'q-1', appointment: { patient_id: 'pat-1' } }),
        entry({ id: 'q-2', appointment: { patient_id: 'pat-2' } }),
      ]);
      prisma.userProfiles.findFirst
        .mockResolvedValueOnce({ id: 'user-1' }) // pat-1 has a linked login
        .mockResolvedValueOnce(null); // pat-2 does not

      const result = await service.broadcastDelay('cln-a', 15, staffA);

      expect(result).toEqual({ waiting_count: 2, notified_count: 1 });
      expect(notificationTrigger.dispatch).toHaveBeenCalledTimes(1);
      expect(notificationTrigger.dispatch).toHaveBeenCalledWith('user-1', 'queue_delay', expect.objectContaining({
        message: expect.stringContaining('15 minutes'),
      }));
    });

    it('only considers entries still waiting, never called/in_progress/done', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianRow);
      prisma.queueEntries.findMany.mockResolvedValue([]);
      await service.broadcastDelay('cln-a', 10, staffA);
      expect(prisma.queueEntries.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ clinician_id: 'cln-a', status: 'waiting' }),
      }));
    });
  });

  describe('unbilledVisits', () => {
    it('rejects a cross-org clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-b' });
      await expect(service.unbilledVisits('clinic-1', staffA)).rejects.toThrow(NotFoundException);
    });

    it('queries completed, non-deleted appointments with no succeeded payment', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicRow);
      await service.unbilledVisits('clinic-1', staffA);
      const where = prisma.appointments.findMany.mock.calls[0][0].where;
      expect(where).toEqual(expect.objectContaining({
        clinic_id: 'clinic-1', status: 'completed', is_deleted: false,
        payments: { none: { status: 'succeeded' } },
      }));
    });
  });

  describe('syncFromAppointmentStatus (hooked from AppointmentsService.transitionStatus)', () => {
    const appt = { id: 'appt-1', clinic_id: 'clinic-1', clinician_id: 'cln-a', token_no: 7 };

    it('creates a new queue entry on first check-in', async () => {
      prisma.queueEntries.findUnique.mockResolvedValue(null);
      await service.syncFromAppointmentStatus(prisma, appt, 'checked_in');
      expect(prisma.queueEntries.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ appointment_id: 'appt-1', clinic_id: 'clinic-1', clinician_id: 'cln-a', token_no: 7 }),
      }));
    });

    it('resets an existing entry to waiting on re-check-in (post-reset)', async () => {
      prisma.queueEntries.findUnique.mockResolvedValue(entry({ status: 'no_show' }));
      await service.syncFromAppointmentStatus(prisma, appt, 'checked_in');
      expect(prisma.queueEntries.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'q-1' }, data: expect.objectContaining({ status: 'waiting' }),
      }));
      expect(prisma.queueEntries.create).not.toHaveBeenCalled();
    });

    it('is a no-op for a status transition when no queue entry exists (never checked in via the queue)', async () => {
      prisma.queueEntries.findUnique.mockResolvedValue(null);
      await service.syncFromAppointmentStatus(prisma, appt, 'completed');
      expect(prisma.queueEntries.update).not.toHaveBeenCalled();
    });

    it('marks the entry in_progress on in_consultation', async () => {
      prisma.queueEntries.findUnique.mockResolvedValue(entry());
      await service.syncFromAppointmentStatus(prisma, appt, 'in_consultation');
      expect(prisma.queueEntries.update).toHaveBeenCalledWith({ where: { id: 'q-1' }, data: { status: 'in_progress' } });
    });

    it('marks the entry no_show on no_show', async () => {
      prisma.queueEntries.findUnique.mockResolvedValue(entry());
      await service.syncFromAppointmentStatus(prisma, appt, 'no_show');
      expect(prisma.queueEntries.update).toHaveBeenCalledWith({ where: { id: 'q-1' }, data: { status: 'no_show' } });
    });

    it('deletes the entry on cancellation', async () => {
      prisma.queueEntries.findUnique.mockResolvedValue(entry());
      await service.syncFromAppointmentStatus(prisma, appt, 'cancelled');
      expect(prisma.queueEntries.delete).toHaveBeenCalledWith({ where: { id: 'q-1' } });
    });

    it('deletes the entry when reset back to scheduled', async () => {
      prisma.queueEntries.findUnique.mockResolvedValue(entry());
      await service.syncFromAppointmentStatus(prisma, appt, 'scheduled');
      expect(prisma.queueEntries.delete).toHaveBeenCalledWith({ where: { id: 'q-1' } });
    });

    describe('auto-recall on completion (US-QUE-05)', () => {
      it('increments served_since_skip for other skipped entries on this clinician\'s queue', async () => {
        prisma.queueEntries.findUnique.mockResolvedValue(entry({ id: 'q-just-served' }));
        prisma.queueEntries.findMany.mockResolvedValue([
          entry({ id: 'q-skip-1', status: 'skipped', skip_return_after: 3, served_since_skip: 0 }),
        ]);
        await service.syncFromAppointmentStatus(prisma, appt, 'completed');
        expect(prisma.queueEntries.update).toHaveBeenCalledWith({ where: { id: 'q-skip-1' }, data: { served_since_skip: 1 } });
      });

      it('auto-returns a skipped entry to waiting once it reaches its return_after threshold', async () => {
        prisma.queueEntries.findUnique.mockResolvedValue(entry({ id: 'q-just-served' }));
        prisma.queueEntries.findMany.mockResolvedValue([
          entry({ id: 'q-skip-1', status: 'skipped', skip_return_after: 3, served_since_skip: 2 }),
        ]);
        await service.syncFromAppointmentStatus(prisma, appt, 'completed');
        expect(prisma.queueEntries.update).toHaveBeenCalledWith({
          where: { id: 'q-skip-1' },
          data: { status: 'waiting', served_since_skip: 0, skip_return_after: null, called_at: null },
        });
        expect(prisma.queueEvents.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ action: 'auto_recalled' }) }),
        );
      });

      it('never counts the entry that was just served against itself', async () => {
        prisma.queueEntries.findUnique.mockResolvedValue(entry({ id: 'q-just-served' }));
        prisma.queueEntries.findMany.mockResolvedValue([]);
        await service.syncFromAppointmentStatus(prisma, appt, 'completed');
        const excludeArg = prisma.queueEntries.findMany.mock.calls[0][0].where.id;
        expect(excludeArg).toEqual({ not: 'q-just-served' });
      });
    });
  });
});
