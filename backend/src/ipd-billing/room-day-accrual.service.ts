import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { IpdBillingService } from './ipd-billing.service';

const LIVE_STATUSES = ['pending', 'admitted', 'discharge_initiated'];

/**
 * REQ179 (IPD slice 4) — room-day and nursing charge accrual.
 *
 * Cron AND on-read catch-up (PLAN251's own account of why both exist): the
 * cron is the optimisation, the on-read call (IpdBillingResolver's own
 * `ipdBill`/`admissionIpdBill` queries, before returning the bill) is the
 * correctness guarantee. Cron-only loses a day on any missed run and shows
 * a stale total; discharge-only is disqualified outright because a TPA
 * enhancement trigger *is* the running bill (slice 5). Idempotent purely
 * via the two partial unique indexes on IpdCharges
 * (`ipd_charges_room_day_once_per_occupancy_day` /
 * `..._nursing_once_per_occupancy_day`) — this service never checks for an
 * existing row itself, it just posts and lets a caught unique-violation
 * mean "already posted".
 *
 * Documented simplification: `discharge_cutoff_hour` is interpreted as a
 * UTC hour, not converted from IST. No backend timezone-conversion library
 * exists anywhere in this codebase (dayjs is frontend-only), and every
 * other backend date computation already operates in raw UTC. A future
 * slice can add real IST conversion; this is a stated gap, not a silent
 * wrong answer — see PLAN251 for the full account.
 */
@Injectable()
export class RoomDayAccrualService {
  private readonly logger = new Logger(RoomDayAccrualService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: IpdBillingService,
  ) {}

  @Cron('0 * * * *')
  async sweep() {
    const admissions = await this.prisma.admissions.findMany({ where: { status: { in: LIVE_STATUSES }, is_deleted: false } });
    for (const a of admissions) {
      try {
        await this.accrueForAdmission(a.id);
      } catch (err) {
        this.logger.error(`Failed to accrue room-day charges for admission ${a.id}: ${(err as Error).message}`);
      }
    }
  }

  private dayWindows(admittedAt: Date, rangeEnd: Date, mode: string, cutoffHour: number): { start: Date; end: Date }[] {
    const windows: { start: Date; end: Date }[] = [];
    if (mode === 'rolling_24h') {
      let start = admittedAt;
      while (start < rangeEnd) {
        const end = new Date(start.getTime() + 86_400_000);
        windows.push({ start, end });
        start = end;
      }
      return windows;
    }
    // calendar_day: the boundary rolls at cutoffHour (UTC — see the
    // documented simplification in this file's own header comment).
    const boundaryAtOrBefore = (d: Date) => {
      const b = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), cutoffHour, 0, 0));
      if (b.getTime() > d.getTime()) b.setUTCDate(b.getUTCDate() - 1);
      return b;
    };
    let start = boundaryAtOrBefore(admittedAt);
    const lastBoundary = boundaryAtOrBefore(rangeEnd);
    while (start.getTime() <= lastBoundary.getTime()) {
      windows.push({ start, end: new Date(start.getTime() + 86_400_000) });
      start = new Date(start.getTime() + 86_400_000);
    }
    return windows;
  }

  async accrueForAdmission(admissionId: string): Promise<void> {
    const admission = await this.prisma.admissions.findUnique({ where: { id: admissionId } });
    if (!admission || admission.is_deleted) return;

    const settings = await this.billingService.getSettingsRowOrDefault(admission.clinic_id);
    if (!settings.auto_post_room_charges) return;

    const occupancies = await this.prisma.bedOccupancies.findMany({
      where: { admission_id: admissionId, occupancy_kind: 'occupied', is_cancelled: false },
      include: { ward: { include: { bed_charge_product: true, nursing_charge_product: true } } },
      orderBy: { start_at: 'asc' },
    });
    if (occupancies.length === 0) return;

    const rangeEnd = admission.discharged_at ?? new Date();
    const windows = this.dayWindows(admission.admitted_at, rangeEnd, settings.day_boundary_mode, settings.discharge_cutoff_hour);

    for (let i = 0; i < windows.length; i++) {
      const window = windows[i];
      const isAdmissionDay = i === 0;
      const isDischargeDay = !!admission.discharged_at && window.start.getTime() <= admission.discharged_at.getTime() && admission.discharged_at.getTime() < window.end.getTime();
      if (isAdmissionDay && !settings.charge_admission_day) continue;
      if (isDischargeDay && !settings.charge_discharge_day) continue;

      const segments = occupancies.filter((o) => o.start_at < window.end && (o.end_at == null || o.end_at > window.start));
      if (segments.length === 0) continue;

      const chosen = await this.chooseSegment(segments, settings.transfer_day_rate_policy, admission);
      if (!chosen) continue;

      await this.postDayCharge(admission, chosen, window.start, 'room_day', chosen.ward.bed_charge_product_id, `Room charge — ${chosen.ward.name}`);
      if (chosen.ward.nursing_charge_product_id) {
        await this.postDayCharge(admission, chosen, window.start, 'nursing', chosen.ward.nursing_charge_product_id, `Nursing charge — ${chosen.ward.name}`);
      }
    }
  }

  private async chooseSegment(segments: any[], policy: string, admission: any) {
    if (segments.length === 1) return segments[0];
    if (policy === 'new_ward') return segments[segments.length - 1];
    if (policy === 'old_ward') return segments[0];
    // higher_of (default): compare resolved bed-charge prices, skipping a
    // segment whose ward has no bed_charge_product configured at all.
    let best: any = null;
    let bestPrice = -1;
    for (const s of segments) {
      if (!s.ward.bed_charge_product_id) continue;
      const price = (await this.billingService.priceProductForAdmission(s.ward.bed_charge_product_id, admission)) ?? 0;
      if (price > bestPrice) {
        bestPrice = price;
        best = s;
      }
    }
    return best ?? segments[segments.length - 1];
  }

  private async postDayCharge(admission: any, occupancy: any, serviceDate: Date, chargeType: string, productId: string | null, description: string) {
    if (!productId) return;
    const unitPricePaise = await this.billingService.priceProductForAdmission(productId, admission);
    if (unitPricePaise == null) return;
    try {
      await this.billingService.postCharge({
        admissionId: admission.id,
        chargeType,
        description,
        serviceDate,
        productId,
        quantity: 1,
        unitPricePaise,
        bedOccupancyId: occupancy.id,
        sourceReferenceType: 'bed_occupancy',
        sourceReferenceId: occupancy.id,
        postedByUserId: null,
      });
    } catch (err: any) {
      const message = (err as { message?: unknown })?.message;
      const constraintName = chargeType === 'room_day' ? 'ipd_charges_room_day_once_per_occupancy_day' : 'ipd_charges_nursing_once_per_occupancy_day';
      if (typeof message === 'string' && message.includes(constraintName)) return; // already posted — idempotent no-op
      throw err;
    }
  }
}
