import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { computeNoShowRisk } from './no-show-risk';
import { AppointmentsService } from './appointments.service';

// P1-17 — the "reminder intensity" lever the phase-plan named as already
// existing was not: appointment_reminder was fully registered as an event
// type (DEFAULTS, quiet-hours bypass, the WhatsApp category map,
// TRANSACTIONAL_EVENTS in notification-trigger.service.ts) but nothing
// anywhere ever called dispatch() for it — the codebase's own comment at
// the top of that file already flagged it as "needs a scheduled job, not
// an event hook". This is that job, mirroring NoShowSweepService's own
// hourly-@Cron / per-row-try-catch / synthetic-system-caller shape
// exactly, since it queries the identical 'confirmed' population.
//
// Intensity: a low/medium-risk appointment gets exactly one reminder, in
// the standard 23-24h-before window. A high-risk appointment also gets an
// earlier one, in the 47-48h-before window -- reminder_count (not just
// reminder_sent_at, which can't express "how many") gates each send so
// low/medium risk can never receive the early one and nothing is ever
// double-sent within the same window on a re-run.
const STANDARD_WINDOW_HOURS = { from: 23, to: 24 };
const EARLY_WINDOW_HOURS = { from: 47, to: 48 };

@Injectable()
export class AppointmentReminderSweepService {
  private readonly logger = new Logger(AppointmentReminderSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationTrigger: NotificationTriggerService,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  @Cron('0 * * * *')
  async sweep() {
    const now = new Date();
    const candidates = await this.prisma.appointments.findMany({
      where: { status: 'confirmed', is_deleted: false },
      include: {
        clinic: { include: { client_organization: true } },
        patient: true,
        clinician: true,
      },
    });

    for (const appointment of candidates) {
      try {
        await this.maybeSendReminder(appointment, now);
      } catch (e: any) {
        // One bad row must not abort the rest of the sweep -- same
        // discipline as NoShowSweepService's own loop.
        this.logger.error(`Failed to send reminder for appointment ${appointment.id}: ${e.message}`);
      }
    }
  }

  private async maybeSendReminder(appointment: any, now: Date) {
    const hoursUntil = (appointment.appointment_time.getTime() - now.getTime()) / 3_600_000;
    if (hoursUntil < 0) return; // already past -- no-show-sweep's own concern, not this one's

    const risk = computeNoShowRisk({
      noShowCount: appointment.patient?.no_show_count ?? 0,
      leadTimeDays: (appointment.appointment_time.getTime() - new Date(appointment.created_at).getTime()) / 86_400_000,
      isSelfBooked: !appointment.booked_by_user_id,
      noShowCountThreshold: appointment.clinic?.client_organization?.no_show_prepayment_threshold ?? 3,
    });
    const maxReminders = risk.level === 'high' ? 2 : 1;
    if (appointment.reminder_count >= maxReminders) return;

    const inEarlyWindow = hoursUntil <= EARLY_WINDOW_HOURS.to && hoursUntil > EARLY_WINDOW_HOURS.from;
    const inStandardWindow = hoursUntil <= STANDARD_WINDOW_HOURS.to && hoursUntil > STANDARD_WINDOW_HOURS.from;
    const shouldSendEarly = risk.level === 'high' && appointment.reminder_count === 0 && inEarlyWindow;
    const shouldSendStandard = inStandardWindow;
    if (!shouldSendEarly && !shouldSendStandard) return;

    const recipientUserId = await this.resolvePatientUserId(appointment.patient_id);
    if (recipientUserId) {
      // P2-16 — the whole reason this slice exists: the SMS/WhatsApp text
      // sendWhatsapp()/sendSms() actually deliver never included a link of
      // any kind before this (action_url below is in-app-notification-bell
      // only, never passed to an external channel — notification-trigger
      // .service.ts's own dispatch()). issueRescheduleToken() returns null
      // (skip the line entirely, mint nothing) when this appointment
      // already has a still-valid, unused reschedule link out from an
      // earlier reminder in the same cycle — see its own comment for why.
      const rescheduleToken = await this.appointmentsService.issueRescheduleToken(appointment.id, appointment.appointment_time);
      const rescheduleLine = rescheduleToken
        ? ` Need to reschedule? ${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/reschedule/${rescheduleToken}`
        : '';
      await this.notificationTrigger.dispatch(recipientUserId, 'appointment_reminder', {
        title: shouldSendEarly ? 'Upcoming appointment in 2 days' : 'Appointment tomorrow',
        message: `Your appointment with ${appointment.clinician.first_name} ${appointment.clinician.last_name} is on ${appointment.appointment_time.toLocaleDateString('en-IN')}.${rescheduleLine}`,
        type: 'appointment',
        action_url: `/appointments/${appointment.id}`,
      });
    }

    await this.prisma.appointments.update({
      where: { id: appointment.id },
      data: { reminder_sent_at: now, reminder_count: { increment: 1 } },
    });
  }

  // Patients don't always have a login account (a family member's
  // dependant profile, a walk-in never given portal access) -- silently
  // a no-op in that case, matching every other notify path's own
  // established convention for an unlinked patient.
  private async resolvePatientUserId(patientId: string): Promise<string | null> {
    const linked = await this.prisma.userProfiles.findFirst({ where: { patient_id: patientId, is_deleted: false }, select: { id: true } });
    return linked?.id ?? null;
  }
}
