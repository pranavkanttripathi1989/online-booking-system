import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { ImmunizationsService } from './immunizations.service';

// REQ167 (P2-11) -- daily sweep, mirrors low-stock-sweep.service.ts's exact
// shape (cron pattern, per-row try/catch, synthetic-caller-free design).
//
// Dedup mirrors low-stock-sweep.service.ts's own mechanism -- no new schema
// field needed: skip a patient if an identically-titled notification was
// already created for the recipient within the last 7 days. A 7-day window,
// not "today" -- an immunization reminder is not urgent-daily like a stock
// alert, so a shorter re-notify cadence would be spam.
//
// Recipient resolution is NOT a plain copy of
// appointment-reminder-sweep.service.ts's own resolvePatientUserId(): a
// child patient -- the primary population this feature exists for -- has
// no login account of its own (CLAUDE.md's own documented design; the
// parent/guardian's account holds the login). Falls back through
// PatientRelations to the owning guardian's own linked account before
// giving up.
const DEDUP_WINDOW_DAYS = 7;

@Injectable()
export class ImmunizationReminderSweepService {
  private readonly logger = new Logger(ImmunizationReminderSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationTrigger: NotificationTriggerService,
    private readonly immunizationsService: ImmunizationsService,
  ) {}

  @Cron('0 9 * * *')
  async sweep() {
    const now = new Date();
    const patients = await this.prisma.patients.findMany({
      where: { is_deleted: false, date_of_birth: { gte: new Date(now.getTime() - 16 * 365 * 24 * 60 * 60 * 1000) } },
    });

    for (const patient of patients) {
      try {
        await this.maybeSendReminder(patient.id, now);
      } catch (e: any) {
        // One bad row must not abort the rest of the sweep -- same
        // discipline as every other sweep service's own loop.
        this.logger.error(`Failed to send immunization reminder for patient ${patient.id}: ${e.message}`);
      }
    }
  }

  private async maybeSendReminder(patientId: string, now: Date) {
    const status = await this.immunizationsService.computePatientStatus(patientId, now);
    const due = status.filter((s) => s.status === 'overdue' || s.status === 'due_soon');
    if (due.length === 0) return;

    const recipientUserId = await this.resolveNotifiableUserId(patientId);
    if (!recipientUserId) return; // neither the patient nor their guardian has a login -- silent no-op, matching every other notify path's established convention

    const title = 'Immunizations due';
    const windowStart = new Date(now.getTime() - DEDUP_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const alreadySentRecently = await this.prisma.notifications.findFirst({
      where: { user_id: recipientUserId, title, created_at: { gte: windowStart } },
    });
    if (alreadySentRecently) return;

    const names = due.map((d) => `${d.vaccine_name} (dose ${d.dose_number})`).join(', ');
    await this.notificationTrigger.dispatch(recipientUserId, 'immunization_due', {
      title,
      message: `The following immunizations are due or overdue: ${names}.`,
      type: 'alert',
      priority: 'medium',
    });
  }

  private async resolvePatientUserId(patientId: string): Promise<string | null> {
    const linked = await this.prisma.userProfiles.findFirst({ where: { patient_id: patientId, is_deleted: false }, select: { id: true } });
    return linked?.id ?? null;
  }

  private async resolveNotifiableUserId(patientId: string): Promise<string | null> {
    const direct = await this.resolvePatientUserId(patientId);
    if (direct) return direct;
    const relation = await this.prisma.patientRelations.findFirst({ where: { related_patient_id: patientId } });
    if (!relation) return null;
    return this.resolvePatientUserId(relation.patient_id);
  }
}
