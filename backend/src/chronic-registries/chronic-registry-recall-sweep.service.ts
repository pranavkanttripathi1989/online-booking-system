import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { computeRecallStatus } from './chronic-registries.service';

// REQ168 (P2-12) -- daily sweep, mirrors low-stock-sweep.service.ts's exact
// shape (cron pattern, per-org admin/manager fan-out, Notifications-table
// title+window dedup) -- NOT immunization-reminder-sweep's patient/guardian-
// facing shape, since this is deliberately a population-health outreach
// list for clinic staff to work from ("call this patient in"), not an
// automated reminder to the patient themselves.
@Injectable()
export class ChronicRegistryRecallSweepService {
  private readonly logger = new Logger(ChronicRegistryRecallSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationTrigger: NotificationTriggerService,
  ) {}

  @Cron('0 9 * * *')
  async sweep() {
    const now = new Date();
    const enrollments = await this.prisma.chronicRegistryEnrollments.findMany({
      where: { status: 'active', is_deleted: false },
      include: { patient: true },
    });
    const overdue = enrollments.filter((e) => computeRecallStatus(e.last_reviewed_at, now) === 'overdue');
    if (overdue.length === 0) return;

    const byOrg = new Map<string, typeof overdue>();
    for (const e of overdue) {
      const orgId = e.patient.client_org_id;
      if (!orgId) continue; // no org to notify staff in -- nothing this sweep can act on
      if (!byOrg.has(orgId)) byOrg.set(orgId, []);
      byOrg.get(orgId)!.push(e);
    }

    for (const [orgId, orgOverdue] of byOrg) {
      try {
        await this.notifyOrgStaff(orgId, orgOverdue);
      } catch (e: any) {
        // One org's failure must not abort the rest of the sweep -- same
        // discipline as every other sweep service's own loop.
        this.logger.error(`Failed to dispatch chronic-registry recall for org ${orgId}: ${e.message}`);
      }
    }
  }

  private async notifyOrgStaff(orgId: string, overdue: { patient: { first_name: string; last_name: string } }[]) {
    const title = 'Chronic-disease recall due';
    const windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const staff = await this.prisma.userProfiles.findMany({
      where: { client_org_id: orgId, is_deleted: false, role: { name: { in: ['admin', 'manager'] } } },
    });

    const names = overdue.map((e) => `${e.patient.first_name} ${e.patient.last_name}`).join(', ');
    for (const recipient of staff) {
      const alreadySentRecently = await this.prisma.notifications.findFirst({
        where: { user_id: recipient.id, title, created_at: { gte: windowStart } },
      });
      if (alreadySentRecently) continue;
      await this.notificationTrigger.dispatch(recipient.id, 'chronic_registry_recall_due', {
        title,
        message: `${overdue.length} patient(s) are overdue for a chronic-disease recall review: ${names}.`,
        type: 'alert',
        priority: 'medium',
      });
    }
  }
}
