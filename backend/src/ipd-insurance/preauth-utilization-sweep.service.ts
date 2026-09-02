import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';

// 80% of the currently authorized total -- an alert that fires only once
// authorization is already exhausted is a log entry, not a warning.
const UTILIZATION_WARN_THRESHOLD = 0.8;

// REQ179 (IPD slice 5) -- the plan's own "notify the insurance desk at 80%
// of authorization" gate. Same shape as
// admissions/mlc-police-intimation-sweep.service.ts: own Logger, one
// @Cron method, per-row try/catch so one bad row cannot abort the sweep,
// and a same-day duplicate check so a pre-auth sitting at 85% does not
// re-notify every 4 hours for days.
@Injectable()
export class PreAuthUtilizationSweepService {
  private readonly logger = new Logger(PreAuthUtilizationSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationTrigger: NotificationTriggerService,
  ) {}

  @Cron('0 */4 * * *')
  async sweep() {
    const live = await this.prisma.preAuthorizations.findMany({
      where: { status: 'approved', admission_id: { not: null } },
      include: { enhancements: true, admission: { include: { patient: true } } },
    });
    if (live.length === 0) return;

    for (const preauth of live) {
      try {
        if (!preauth.admission_id) continue;
        const approvedEnhancements = preauth.enhancements.filter((e) => e.status === 'approved');
        const authorizedTotalPaise =
          (preauth.approved_amount_paise ?? 0) + approvedEnhancements.reduce((sum, e) => sum + (e.approved_amount_paise ?? 0), 0);
        if (authorizedTotalPaise <= 0) continue;

        const bill = await this.prisma.ipdBills.findUnique({ where: { admission_id: preauth.admission_id } });
        const billedPaise = bill?.gross_paise ?? 0;
        const utilization = billedPaise / authorizedTotalPaise;
        if (utilization < UTILIZATION_WARN_THRESHOLD) continue;

        const recipients = await this.prisma.userProfiles.findMany({
          where: { clinic_id: preauth.clinic_id, role: { name: { in: ['manager', 'admin'] } }, is_deleted: false },
          select: { id: true },
        });
        if (recipients.length === 0) continue;

        const patientName = [preauth.admission?.patient?.first_name, preauth.admission?.patient?.last_name].filter(Boolean).join(' ');
        const pctUsed = Math.round(utilization * 100);
        const title = `Pre-auth ${pctUsed}% utilized — ${patientName || 'a patient'}`;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        for (const recipient of recipients) {
          const alreadySentToday = await this.prisma.notifications.findFirst({
            where: { user_id: recipient.id, title, created_at: { gte: startOfToday } },
          });
          if (alreadySentToday) continue;

          await this.notificationTrigger.dispatch(recipient.id, 'preauth_enhancement_needed', {
            title,
            message: `The running bill for ${patientName || 'this admission'} has reached ${pctUsed}% of the currently authorized amount (₹${(authorizedTotalPaise / 100).toLocaleString('en-IN')}). Request an enhancement before authorization is exhausted.`,
            type: 'alert',
            priority: 'high',
            action_url: `/ipd/insurance/${preauth.id}`,
          });
        }
      } catch (err) {
        this.logger.error(`Failed to dispatch pre-auth utilization alert for ${preauth.id}: ${(err as Error).message}`);
      }
    }
  }
}
