import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';

// REQ022 (US-PHR-09, scoped) — daily sweep, same @Cron pattern as
// NoShowSweepService/ScheduledReportsService. Notifies every manager/admin
// in a drug's own org when that drug's total remaining stock is at or
// below its configured reorder_level. Re-notifies once per calendar day
// while a drug stays low (a simple, honest dedup — not "only once ever",
// which would let a real shortage go unmentioned for weeks) by skipping a
// drug if an identically-titled alert already went to that recipient today.
@Injectable()
export class LowStockSweepService {
  private readonly logger = new Logger(LowStockSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationTrigger: NotificationTriggerService,
  ) {}

  @Cron('0 8 * * *')
  async sweep() {
    const drugs = await this.prisma.drugs.findMany({
      where: { is_deleted: false, reorder_level: { not: null }, client_org_id: { not: null } },
    });
    if (drugs.length === 0) return;

    const totals = await this.prisma.drugBatches.groupBy({
      by: ['drug_id'],
      where: { drug_id: { in: drugs.map((d) => d.id) } },
      _sum: { quantity_remaining: true },
    });
    const totalByDrug = new Map(totals.map((t) => [t.drug_id, t._sum.quantity_remaining ?? 0]));

    const lowStockDrugs = drugs.filter((d) => (totalByDrug.get(d.id) ?? 0) <= (d.reorder_level as number));
    if (lowStockDrugs.length === 0) return;

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    for (const drug of lowStockDrugs) {
      const title = `Low stock: ${drug.name}`;
      const admins = await this.prisma.userProfiles.findMany({
        where: { client_org_id: drug.client_org_id, is_deleted: false, role: { name: { in: ['admin', 'manager'] } } },
      });
      for (const admin of admins) {
        const alreadySentToday = await this.prisma.notifications.findFirst({
          where: { user_id: admin.id, title, created_at: { gte: startOfToday } },
        });
        if (alreadySentToday) continue;
        try {
          await this.notificationTrigger.dispatch(admin.id, 'low_stock_alert', {
            title,
            message: `${drug.name} is at ${totalByDrug.get(drug.id) ?? 0} units, at or below its configured reorder level of ${drug.reorder_level}.`,
            type: 'alert',
            priority: 'medium',
          });
        } catch (err) {
          this.logger.error(`Failed to dispatch low-stock alert for drug ${drug.id} to user ${admin.id}: ${(err as Error).message}`);
        }
      }
    }
  }
}
