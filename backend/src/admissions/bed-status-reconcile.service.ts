import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

export interface BedStatusDivergence {
  bed_id: string;
  bed_number: string;
  cached_status: string;
  derived_status: string;
}

// REQ179 (IPD slice 1) — reconcile the Beds.status cache against
// BedOccupancies, the source of truth.
//
// Beds.status is a denormalised cache maintained in the same transaction as
// every occupancy write (the DrugBatches.quantity_remaining / StockMovements
// relationship). It exists so the bed board can filter and colour without
// evaluating the timeline per row. A cache is allowed to be wrong; it is not
// allowed to be *silently* wrong — so this sweep re-derives every bed's status
// nightly, corrects it, and logs the divergence loudly enough to notice.
//
// A divergence found here is a bug report, not routine maintenance: it means
// some path wrote one of the pair without the other.
@Injectable()
export class BedStatusReconcileService {
  private readonly logger = new Logger(BedStatusReconcileService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 3 * * *')
  async sweep() {
    const divergences = await this.reconcile(true);
    if (divergences.length > 0) {
      this.logger.warn(
        `Bed status cache diverged on ${divergences.length} bed(s) and was corrected: ` +
          divergences.map((d) => `${d.bed_number} (${d.cached_status}→${d.derived_status})`).join(', '),
      );
    }
  }

  /**
   * Re-derive each bed's status from its live occupancy row.
   *
   * @param apply when true, corrects the cache; when false, reports only
   * @returns every bed whose cached status disagreed with the timeline
   */
  async reconcile(apply: boolean): Promise<BedStatusDivergence[]> {
    const beds = await this.prisma.beds.findMany({
      where: { is_deleted: false },
      include: {
        occupancies: { where: { end_at: null, is_cancelled: false }, take: 1 },
      },
    });

    const divergences: BedStatusDivergence[] = [];
    for (const bed of beds as any[]) {
      try {
        const live = bed.occupancies?.[0];
        // No open occupancy means the bed is free — EXCEPT that 'cleaning' is
        // a legitimate cached state with no timeline row behind it (discharge
        // sets it directly, and housekeeping clears it via releaseBed). Left
        // alone so the sweep does not silently hand an unturned bed to the
        // next patient.
        const derived = live ? (live.admission_id ? 'occupied' : live.occupancy_kind) : 'available';
        if (derived === 'available' && bed.status === 'cleaning') continue;

        if (bed.status !== derived) {
          divergences.push({
            bed_id: bed.id,
            bed_number: bed.bed_number,
            cached_status: bed.status,
            derived_status: derived,
          });
          if (apply) {
            await this.prisma.beds.update({ where: { id: bed.id }, data: { status: derived } });
          }
        }
      } catch (err) {
        this.logger.error(`Failed to reconcile bed ${bed.id}: ${(err as Error).message}`);
      }
    }
    return divergences;
  }
}
