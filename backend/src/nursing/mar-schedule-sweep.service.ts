import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

// A rolling 24h forward window is plenty for a ward round to work from and
// keeps each sweep run cheap — there is no value in materialising a dose
// scheduled three days out.
const WINDOW_HOURS = 24;
const LIVE_STATUSES = ['pending', 'admitted', 'discharge_initiated'];

// REQ179 (IPD slice 2) — turns a standing IpdMedicationOrders row's
// schedule_times ("08:00","14:00","20:00", ...) into real, dated
// MedicationAdministrations rows a nurse can act on. Freely re-runnable:
// MedicationAdministrations.@@unique([order_id, scheduled_at]) makes every
// slot's upsert a no-op the second and third time the sweep sees it, exactly
// the guarantee the migration's own comment names. Same shape as
// mlc-police-intimation-sweep.service.ts / low-stock-sweep.service.ts: own
// Logger, one @Cron method, per-row try/catch.
@Injectable()
export class MarScheduleSweepService {
  private readonly logger = new Logger(MarScheduleSweepService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/30 * * * *')
  async sweep() {
    const windowStart = new Date();
    const windowEnd = new Date(windowStart.getTime() + WINDOW_HOURS * 3_600_000);

    const orders = await this.prisma.ipdMedicationOrders.findMany({
      where: {
        status: 'active',
        is_prn: false,
        start_at: { lte: windowEnd },
        OR: [{ stop_at: null }, { stop_at: { gte: windowStart } }],
      },
      include: { admission: true },
    });
    if (orders.length === 0) return;

    for (const order of orders) {
      try {
        if (!LIVE_STATUSES.includes(order.admission.status)) continue;
        const times = (order.schedule_times_json as unknown as string[] | null) ?? [];
        if (times.length === 0) continue;

        const slots = this.materializeSlots(order.start_at, order.stop_at, times, windowStart, windowEnd);
        for (const scheduledAt of slots) {
          await this.prisma.medicationAdministrations.upsert({
            where: { order_id_scheduled_at: { order_id: order.id, scheduled_at: scheduledAt } },
            update: {},
            create: {
              client_org_id: order.client_org_id,
              admission_id: order.admission_id,
              order_id: order.id,
              drug_id: order.drug_id,
              scheduled_at: scheduledAt,
              status: 'scheduled',
            },
          });
        }
      } catch (err) {
        this.logger.error(`Failed to materialise MAR rows for order ${order.id}: ${(err as Error).message}`);
      }
    }
  }

  private materializeSlots(
    startAt: Date,
    stopAt: Date | null,
    times: string[],
    windowStart: Date,
    windowEnd: Date,
  ): Date[] {
    const slots: Date[] = [];
    const dayCursor = new Date(windowStart);
    dayCursor.setHours(0, 0, 0, 0);
    const lastDay = new Date(windowEnd);
    lastDay.setHours(0, 0, 0, 0);

    while (dayCursor.getTime() <= lastDay.getTime()) {
      for (const time of times) {
        const [hh, mm] = time.split(':').map((n) => parseInt(n, 10));
        if (Number.isNaN(hh) || Number.isNaN(mm)) continue;
        const slot = new Date(dayCursor);
        slot.setHours(hh, mm, 0, 0);
        if (slot < startAt || slot < windowStart || slot > windowEnd) continue;
        if (stopAt && slot > stopAt) continue;
        slots.push(slot);
      }
      dayCursor.setDate(dayCursor.getDate() + 1);
    }
    return slots;
  }
}
