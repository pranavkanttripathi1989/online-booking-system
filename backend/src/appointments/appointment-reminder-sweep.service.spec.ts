import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentReminderSweepService } from './appointment-reminder-sweep.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { AppointmentsService } from './appointments.service';

// P1-17 — mirrors NoShowSweepService's own spec pattern exactly (same
// fake-timer "now", same per-row try/catch coverage), against the
// identical 'confirmed' population that service queries.
describe('AppointmentReminderSweepService', () => {
  let service: AppointmentReminderSweepService;
  let prisma: any;
  let notificationTrigger: { dispatch: jest.Mock };
  let appointmentsService: { issueRescheduleToken: jest.Mock };

  const clinic = { id: 'clinic-a', client_organization: { no_show_prepayment_threshold: 3 } };
  const clinician = { first_name: 'Dr', last_name: 'Real' };
  const patient = { no_show_count: 0 };

  // "now" is fixed at 2026-08-25T09:00:00Z throughout.
  function appt(hoursFromNow: number, overrides: any = {}) {
    return {
      id: 'appt-1',
      patient_id: 'patient-1',
      status: 'confirmed',
      is_deleted: false,
      appointment_time: new Date(Date.now() + hoursFromNow * 3_600_000),
      created_at: new Date(Date.now() - 5 * 86_400_000), // booked 5 days ago -- unremarkable lead time
      booked_by_user_id: 'staff-1', // staff-booked -- unremarkable channel
      reminder_count: 0,
      clinic,
      clinician,
      patient,
      ...overrides,
    };
  }

  beforeEach(async () => {
    prisma = {
      appointments: { findMany: jest.fn(), update: jest.fn() },
      userProfiles: { findFirst: jest.fn().mockResolvedValue({ id: 'user-1' }) },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentReminderSweepService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationTriggerService, useValue: (notificationTrigger = { dispatch: jest.fn() }) },
        // P2-16 — every pre-existing test in this file predates the
        // reschedule-link feature; default to "a fresh token was minted"
        // so they exercise the (unchecked-by-them) message text unchanged.
        { provide: AppointmentsService, useValue: (appointmentsService = { issueRescheduleToken: jest.fn().mockResolvedValue('raw-reschedule-token') }) },
      ],
    }).compile();
    service = module.get(AppointmentReminderSweepService);
    jest.useFakeTimers().setSystemTime(new Date('2026-08-25T09:00:00Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('sends the standard reminder in the 23-24h-before window for a low-risk appointment', async () => {
    prisma.appointments.findMany.mockResolvedValue([appt(23.5)]);
    await service.sweep();
    expect(notificationTrigger.dispatch).toHaveBeenCalledWith('user-1', 'appointment_reminder', expect.objectContaining({ type: 'appointment' }));
    expect(prisma.appointments.update).toHaveBeenCalledWith({
      where: { id: 'appt-1' },
      data: { reminder_sent_at: expect.any(Date), reminder_count: { increment: 1 } },
    });
  });

  it('does nothing outside any reminder window', async () => {
    prisma.appointments.findMany.mockResolvedValue([appt(10)]);
    await service.sweep();
    expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
  });

  it('never sends a second standard reminder once one has already gone out', async () => {
    prisma.appointments.findMany.mockResolvedValue([appt(23.5, { reminder_count: 1 })]);
    await service.sweep();
    expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
  });

  it('a low-risk appointment gets no early (47-48h) reminder, only the standard one', async () => {
    prisma.appointments.findMany.mockResolvedValue([appt(47.5)]);
    await service.sweep();
    expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
  });

  it('a high-risk appointment gets an extra early reminder at 47-48h, on top of the standard one', async () => {
    prisma.appointments.findMany.mockResolvedValue([appt(47.5, { patient: { no_show_count: 5 } })]);
    await service.sweep();
    expect(notificationTrigger.dispatch).toHaveBeenCalledWith('user-1', 'appointment_reminder', expect.objectContaining({ title: 'Upcoming appointment in 2 days' }));
    expect(prisma.appointments.update).toHaveBeenCalledWith({
      where: { id: 'appt-1' },
      data: { reminder_sent_at: expect.any(Date), reminder_count: { increment: 1 } },
    });
  });

  it('a high-risk appointment still gets its standard reminder at 24h even after the early one already went out', async () => {
    prisma.appointments.findMany.mockResolvedValue([appt(23.5, { patient: { no_show_count: 5 }, reminder_count: 1 })]);
    await service.sweep();
    expect(notificationTrigger.dispatch).toHaveBeenCalledWith('user-1', 'appointment_reminder', expect.objectContaining({ title: 'Appointment tomorrow' }));
  });

  it('a high-risk appointment never gets a third reminder once both have gone out', async () => {
    prisma.appointments.findMany.mockResolvedValue([appt(23.5, { patient: { no_show_count: 5 }, reminder_count: 2 })]);
    await service.sweep();
    expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
  });

  it('is silently a no-op for a patient with no linked login account, matching every other notify path', async () => {
    prisma.userProfiles.findFirst.mockResolvedValue(null);
    prisma.appointments.findMany.mockResolvedValue([appt(23.5)]);
    await service.sweep();
    expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
    // Still marks the reminder as sent -- an unlinked patient's own
    // reminder isn't retried forever just because there's no app to notify.
    expect(prisma.appointments.update).toHaveBeenCalled();
  });

  it('continues sweeping remaining rows if one fails', async () => {
    notificationTrigger.dispatch.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
    prisma.appointments.findMany.mockResolvedValue([appt(23.5, { id: 'appt-1' }), appt(23.5, { id: 'appt-2', patient_id: 'patient-2' })]);
    await service.sweep();
    expect(notificationTrigger.dispatch).toHaveBeenCalledTimes(2);
    expect(prisma.appointments.update).toHaveBeenCalledTimes(1);
  });

  it('only ever queries confirmed, non-deleted appointments', async () => {
    prisma.appointments.findMany.mockResolvedValue([]);
    await service.sweep();
    expect(prisma.appointments.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'confirmed', is_deleted: false } }),
    );
  });

  it('never touches an appointment already in the past', async () => {
    prisma.appointments.findMany.mockResolvedValue([appt(-1)]);
    await service.sweep();
    expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
    expect(prisma.appointments.update).not.toHaveBeenCalled();
  });

  // P2-16 — this sweep is the sole place a reschedule link is ever minted;
  // before this slice, the reminder text carried no link at all (only an
  // action_url wired into the in-app-notification-bell payload, never the
  // SMS/WhatsApp text sendWhatsapp()/sendSms() actually deliver).
  describe('self-serve reschedule link (P2-16)', () => {
    it('mints a token and includes the reschedule link in the dispatched message', async () => {
      prisma.appointments.findMany.mockResolvedValue([appt(23.5)]);
      await service.sweep();
      expect(appointmentsService.issueRescheduleToken).toHaveBeenCalledWith('appt-1', expect.any(Date));
      expect(notificationTrigger.dispatch).toHaveBeenCalledWith(
        'user-1',
        'appointment_reminder',
        expect.objectContaining({ message: expect.stringContaining('/reschedule/raw-reschedule-token') }),
      );
    });

    it('omits the reschedule line entirely when a still-valid link was already sent (issueRescheduleToken returns null)', async () => {
      appointmentsService.issueRescheduleToken.mockResolvedValue(null);
      prisma.appointments.findMany.mockResolvedValue([appt(23.5)]);
      await service.sweep();
      expect(notificationTrigger.dispatch).toHaveBeenCalledWith(
        'user-1',
        'appointment_reminder',
        expect.objectContaining({ message: expect.not.stringContaining('/reschedule/') }),
      );
    });

    it('never mints a token for a patient with no linked login account — nothing gets sent to carry it', async () => {
      prisma.userProfiles.findFirst.mockResolvedValue(null);
      prisma.appointments.findMany.mockResolvedValue([appt(23.5)]);
      await service.sweep();
      expect(appointmentsService.issueRescheduleToken).not.toHaveBeenCalled();
    });
  });
});
