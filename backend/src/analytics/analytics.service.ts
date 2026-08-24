import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
// Aliased: this service has its own private orgScope() for the indirect
// (via-clinic) case, which would otherwise shadow the import.
import { orgScope as sharedOrgScope, orgScopeVia } from '../common/scoping/tenant-scope';

const PAISE_TO_RUPEES = (paise?: number | null) => (paise == null ? 0 : paise / 100);
const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_BUCKET: Record<string, 'Scheduled' | 'Completed' | 'Cancelled' | 'No-Show'> = {
  scheduled: 'Scheduled',
  confirmed: 'Scheduled',
  pending: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-Show',
};

const isSameDay = (a: Date, b: Date) =>
  a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();

const formatDayLabel = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });

const NON_OCCUPYING_STATUSES = ['cancelled', 'no_show'];

const hhmmToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const minutesOfDay = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes();
const overlapMinutes = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // BUG006 — was the F-01 ternary, returning `{}` (every tenant) for an
  // org-less caller. Delegates to the shared fail-closed helper.
  private orgScope(user: JwtPayload) {
    return orgScopeVia(user, 'clinic');
  }

  async getClinics(user: JwtPayload) {
    return this.prisma.clinics.findMany({
      where: { is_deleted: false, ...sharedOrgScope(user) }, // BUG006 — was the F-01 ternary
      orderBy: { created_at: 'asc' },
    });
  }

  private async fetchAppointments(clinicId: string | undefined, start: Date, end: Date, user: JwtPayload) {
    return this.prisma.appointments.findMany({
      where: {
        is_deleted: false,
        ...this.orgScope(user),
        ...(clinicId ? { clinic_id: clinicId } : {}),
        appointment_time: { gte: start, lte: end },
      },
      include: { clinic: true, clinician: true, product: true },
    });
  }

  private summarize(appointments: any[]) {
    const total = appointments.length;
    const completed = appointments.filter((a) => a.status === 'completed');
    const cancelled = appointments.filter((a) => a.status === 'cancelled');
    const revenue = completed.reduce((sum, a) => sum + PAISE_TO_RUPEES(a.product?.price), 0);
    const activePatients = new Set(appointments.map((a) => a.patient_id)).size;
    const cancellationRate = total ? (cancelled.length / total) * 100 : 0;
    // REQ029 (US-RPT-01) fallback only — used when computeTrueUtilisation()
    // can't compute a real value (no availability data in scope at all).
    // The primary utilization value is the real one now; see
    // computeTrueUtilisation() below.
    const completionRateProxy = total ? (completed.length / total) * 100 : 0;
    const bookedMinutes = appointments
      .filter((a) => !NON_OCCUPYING_STATUSES.includes(a.status))
      .reduce((sum, a) => sum + (a.duration_minutes ?? 30), 0);
    return { total, revenue, activePatients, cancellationRate, completionRateProxy, bookedMinutes };
  }

  private pctChange(current: number, previous: number) {
    if (!previous) return current ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  // REQ029 (US-RPT-01) — true slot-capacity utilisation: booked minutes ÷
  // available minutes (ClinicianAvailability windows minus SpacerBlocks/
  // LunchBreaks), replacing the completion-rate proxy this field used to
  // return. Ports availableSlots()'s own busy-interval-subtraction algorithm
  // (backend/src/availability/availability.service.ts) rather than
  // reinventing it -- same day-of-week/recurrence_type='daily' window
  // matching, same one-off block_date matching for SpacerBlocks (not full
  // recurrence expansion for spacer blocks -- matches availableSlots()'s
  // own documented simplification, not a new one introduced here).
  //
  // Fetches each in-scope clinician's availability/lunch/spacer rows ONCE
  // (not once per day) via `include`, then walks the date range in memory
  // -- same shape as dashboard.service.ts's own getUtilisationByClinician(),
  // a pre-existing, accepted pattern in this codebase for a bounded
  // calendar-window walk (distinct from the JS-side full-table-scan
  // aggregation project-plans F-15 warns against).
  //
  // Returns null (signalling the caller to fall back to the completion-rate
  // proxy) only when there is zero availability data in scope at all --
  // not a real "0% utilised" answer, which would be misleading.
  private async computeTrueUtilisation(
    clinicId: string | undefined,
    start: Date,
    end: Date,
    bookedMinutes: number,
    user: JwtPayload,
  ): Promise<number | null> {
    const clinicians = await this.prisma.clinicians.findMany({
      where: {
        is_deleted: false,
        is_active: true,
        ...(clinicId ? { clinic_id: clinicId } : {}),
        ...this.orgScope(user),
      },
      include: {
        availability: { where: { is_deleted: false, is_active: true, mode: 'slot' } },
        lunchBreaks: { where: { is_deleted: false } },
        spacerBlocks: { where: { is_deleted: false, block_date: { gte: start, lte: end } } },
      },
    });

    let availableMinutes = 0;
    for (const clinician of clinicians) {
      for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
        const day = new Date(t);
        const dow = day.getUTCDay();

        const windows = clinician.availability.filter(
          (a: any) =>
            (a.day_of_week === dow || a.recurrence_type === 'daily') &&
            a.valid_from <= day &&
            (!a.valid_until || a.valid_until >= day),
        );
        if (!windows.length) continue;

        const busy: Array<{ start: number; end: number }> = [
          ...clinician.lunchBreaks
            .filter((l: any) => l.day_of_week === dow || l.recurrence_type === 'daily')
            .map((l: any) => ({ start: minutesOfDay(l.start_time), end: minutesOfDay(l.end_time) })),
          ...clinician.spacerBlocks
            .filter((s: any) => s.block_date && isSameDay(s.block_date, day))
            .map((s: any) => ({ start: minutesOfDay(s.start_time), end: minutesOfDay(s.end_time) })),
        ];

        for (const w of windows) {
          const winStart = hhmmToMinutes(w.start_time);
          const winEnd = hhmmToMinutes(w.end_time);
          const winMinutes = Math.max(0, winEnd - winStart);
          const busyInWindow = busy.reduce((sum, b) => sum + overlapMinutes(winStart, winEnd, b.start, b.end), 0);
          availableMinutes += Math.max(0, winMinutes - busyInWindow);
        }
      }
    }

    if (availableMinutes <= 0) return null;
    return Math.min(100, (bookedMinutes / availableMinutes) * 100);
  }

  async getAppointmentStats(
    clinicId: string | undefined,
    startDate: string,
    endDate: string,
    user: JwtPayload,
  ) {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);
    const rangeDays = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - (rangeDays - 1) * DAY_MS);
    prevStart.setUTCHours(0, 0, 0, 0);

    const [appointments, prevAppointments] = await Promise.all([
      this.fetchAppointments(clinicId, start, end, user),
      this.fetchAppointments(clinicId, prevStart, prevEnd, user),
    ]);

    const current = this.summarize(appointments);
    const previous = this.summarize(prevAppointments);

    // REQ029 (US-RPT-01) — real value first, completion-rate proxy only as
    // a fallback when there's no availability data in scope to compute a
    // real one from (see computeTrueUtilisation()'s own doc comment).
    const [trueUtilizationCurrent, trueUtilizationPrevious] = await Promise.all([
      this.computeTrueUtilisation(clinicId, start, end, current.bookedMinutes, user),
      this.computeTrueUtilisation(clinicId, prevStart, prevEnd, previous.bookedMinutes, user),
    ]);
    const utilization = trueUtilizationCurrent ?? current.completionRateProxy;
    const previousUtilization = trueUtilizationPrevious ?? previous.completionRateProxy;

    const timeSeriesData: { date: string; scheduled: number; completed: number; cancelled: number }[] = [];
    for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
      const day = new Date(t);
      const dayAppointments = appointments.filter((a) => isSameDay(new Date(a.appointment_time), day));
      timeSeriesData.push({
        date: formatDayLabel(day),
        scheduled: dayAppointments.filter((a) => ['scheduled', 'confirmed', 'pending'].includes(a.status)).length,
        completed: dayAppointments.filter((a) => a.status === 'completed').length,
        cancelled: dayAppointments.filter((a) => a.status === 'cancelled').length,
      });
    }

    const statusCounts: Record<string, number> = { Scheduled: 0, Completed: 0, Cancelled: 0, 'No-Show': 0 };
    for (const a of appointments) {
      const bucket = STATUS_BUCKET[a.status] ?? 'Scheduled';
      statusCounts[bucket]++;
    }
    const statusDistribution = Object.entries(statusCounts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    const revenueByClinicMap = new Map<string, { name: string; revenue: number }>();
    for (const a of appointments.filter((x) => x.status === 'completed')) {
      const key = a.clinic_id;
      const entry = revenueByClinicMap.get(key) ?? { name: a.clinic.name, revenue: 0 };
      entry.revenue += PAISE_TO_RUPEES(a.product?.price);
      revenueByClinicMap.set(key, entry);
    }
    const revenueByClinic = [...revenueByClinicMap.values()].sort((a, b) => b.revenue - a.revenue);

    const clinicianMap = new Map<string, { id: string; name: string; appointments: number; revenue: number }>();
    for (const a of appointments.filter((x) => x.status === 'completed')) {
      const key = a.clinician_id;
      const entry = clinicianMap.get(key) ?? {
        id: a.clinician_id,
        name: `${a.clinician.first_name} ${a.clinician.last_name}`,
        appointments: 0,
        revenue: 0,
      };
      entry.appointments++;
      entry.revenue += PAISE_TO_RUPEES(a.product?.price);
      clinicianMap.set(key, entry);
    }
    const topClinicians = [...clinicianMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    return {
      totalAppointments: current.total,
      revenue: current.revenue,
      activePatients: current.activePatients,
      utilization,
      cancellationRate: current.cancellationRate,
      trends: {
        totalAppointments: this.pctChange(current.total, previous.total),
        revenue: this.pctChange(current.revenue, previous.revenue),
        activePatients: this.pctChange(current.activePatients, previous.activePatients),
        utilization: this.pctChange(utilization, previousUtilization),
        cancellationRate: this.pctChange(current.cancellationRate, previous.cancellationRate),
      },
      timeSeriesData,
      statusDistribution,
      revenueByClinic,
      topClinicians,
    };
  }
}
