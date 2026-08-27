import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentReminderSweepService } from './appointment-reminder-sweep.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';

// P1-17 — mirrors NoShowSweepService's own spec pattern exactly (same
// fake-timer "now", same per-row try/catch coverage), against the
// identical 'confirmed' population that service queries.
describe('AppointmentReminderSweepService', () => {
  let service: AppointmentReminderSweepService;
  let prisma: any;
  let notificationTrigger: { dispatch: jest.Mock };

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
});
