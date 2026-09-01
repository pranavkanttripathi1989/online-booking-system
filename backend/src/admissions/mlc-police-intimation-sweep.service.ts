import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';

// Warn with 4 hours to spare rather than at the deadline — an alert that
// fires when the obligation is already breached is a log entry, not a warning.
const WARN_AFTER_HOURS = 20;

// REQ179 (IPD slice 1) — the statutory 24h police-intimation clock.
//
// Same shape as low-stock-sweep.service.ts / retention-purge.service.ts: own
// Logger, one @Cron method, per-row try/catch so one bad row cannot abort the
// sweep, and a same-day duplicate check so a pending MLC does not re-notify
// every hour for days.
@Injectable()
export class MlcPoliceIntimationSweepService {
  private readonly logger = new Logger(MlcPoliceIntimationSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationTrigger: NotificationTriggerService,
  ) {}

  @Cron('0 * * * *')
  async sweep() {
    const cutoff = new Date(Date.now() - WARN_AFTER_HOURS * 3_600_000);
    const pending = await this.prisma.mlcRegisters.findMany({
      where: { police_intimated_at: null, recorded_at: { lte: cutoff } },
      include: { admission: { include: { patient: true } } },
    });
    if (pending.length === 0) return;

    for (const register of pending) {
      try {
        // Notify the org's managers/admins — an MLC intimation is a
        // medical-records-office duty, not the attending clinician's.
        const recipients = await this.prisma.userProfiles.findMany({
          where: {
            clinic_id: register.clinic_id,
            role: { name: { in: ['manager', 'admin'] } },
            is_deleted: false,
          },
          select: { id: true },
        });
        if (recipients.length === 0) continue;

        const hoursElapsed = Math.floor((Date.now() - new Date(register.recorded_at).getTime()) / 3_600_000);
        // Notifications has no event_type column, so per-item dedup keys off a
        // title unique to this MLC plus today — exactly low-stock-sweep's own
        // approach. Re-notifies once per calendar day while the intimation
        // stays pending rather than only once ever: a statutory breach that
        // goes quiet after one alert is the failure mode worth avoiding.
        const title = `Police intimation pending — MLC ${register.mlc_number}`;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        for (const recipient of recipients) {
          const alreadySentToday = await this.prisma.notifications.findFirst({
            where: { user_id: recipient.id, title, created_at: { gte: startOfToday } },
          });
          if (alreadySentToday) continue;

          await this.notificationTrigger.dispatch(recipient.id, 'mlc_police_intimation_due', {
            title,
            message: `MLC ${register.mlc_number} was registered ${hoursElapsed}h ago and police intimation is not yet recorded. The statutory window is 24h.`,
            type: 'alert',
            priority: 'high',
            action_url: `/ipd/mlc/${register.id}`,
          });
        }
      } catch (err) {
        this.logger.error(
          `Failed to dispatch police-intimation reminder for MLC ${register.id}: ${(err as Error).message}`,
        );
      }
    }
  }
}
