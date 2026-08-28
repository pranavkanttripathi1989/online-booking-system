import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
// Aliased: this service has its own private orgScope() for the indirect
// (via-clinic) case, which would otherwise shadow the import.
import { orgScope as sharedOrgScope, orgScopeVia } from '../common/scoping/tenant-scope';
import { DENIAL_CATEGORY_LABELS, DenialCategory } from '../insurance/denial-classification';

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

  // BUG035 -- a prior period with no recorded activity (previous falsy) has
  // no real percent change to report; this used to fabricate a flat 100 (or
  // 0) regardless of current's real magnitude, so every KPI converged on the
  // identical, misleading badge the moment historical data was thin. null
  // means "nothing to compare against", not "unchanged" or "doubled".
  private pctChange(current: number, previous: number): number | null {
    if (!previous) return null;
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

  // REQ029 (US-RPT-02) — new-vs-repeat, acquisition source, lapsed-patient
  // recall list. Patients has no client_org_id of its own (a pre-existing
  // schema quirk — patients.service.ts's own comment); scoped indirectly
  // via the same appointments-relation shape that service already uses.
  async getPatientReportGroup(
    clinicId: string | undefined,
    startDate: string,
    endDate: string,
    lapsedLookbackDays: number,
    user: JwtPayload,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const clinicFilter = clinicId ? { clinic_id: clinicId } : {};
    const orgFilter = user.client_org_id ? { clinic: { client_org_id: user.client_org_id } } : {};

    const patientsInRange = await this.prisma.patients.findMany({
      where: { appointments: { some: { ...clinicFilter, ...orgFilter, appointment_time: { gte: start, lte: end } } } },
      select: { id: true, acquisition_source: true },
    });
    const patientIds = patientsInRange.map((p) => p.id);

    let newPatients = 0;
    let repeatPatients = 0;
    if (patientIds.length) {
      const priorVisitCounts = await this.prisma.appointments.groupBy({
        by: ['patient_id'],
        where: { patient_id: { in: patientIds }, ...clinicFilter, ...orgFilter, appointment_time: { lt: start } },
        _count: { id: true },
      });
      const patientsWithPriorVisit = new Set(priorVisitCounts.map((r) => r.patient_id));
      for (const id of patientIds) {
        if (patientsWithPriorVisit.has(id)) repeatPatients++;
        else newPatients++;
      }
    }

    const sourceCounts = new Map<string, number>();
    for (const p of patientsInRange) {
      const source = p.acquisition_source ?? 'unknown';
      sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
    }
    const acquisitionSourceBreakdown = [...sourceCounts.entries()].map(([source, count]) => ({ source, count }));

    const lapsedCutoff = new Date(Date.now() - lapsedLookbackDays * 24 * 60 * 60 * 1000);
    const lapsedCandidates = await this.prisma.patients.findMany({
      where: {
        appointments: { some: { ...clinicFilter, ...orgFilter } },
        AND: [{ appointments: { none: { ...clinicFilter, ...orgFilter, appointment_time: { gte: lapsedCutoff } } } }],
      },
      include: { appointments: { where: { ...clinicFilter, ...orgFilter }, orderBy: { appointment_time: 'desc' }, take: 1 } },
      take: 200,
    });
    const lapsedPatients = lapsedCandidates.map((p) => ({
      id: p.id,
      full_name: `${p.first_name} ${p.last_name}`,
      last_visit: p.appointments[0]?.appointment_time,
    }));

    return { newPatients, repeatPatients, acquisitionSourceBreakdown, lapsedPatients };
  }

  // P2-04 — denial analytics + payer scorecards, over Claims submitted in
  // the reporting window. Claims has no client_org_id/clinic_id of its
  // own (see insurance.service.ts's own claimsOrgScope comment) -- scoped
  // the identical 2-level-nesting way, duplicated here rather than
  // imported across modules for one small filter object, matching this
  // codebase's own established tolerance for that trade-off (see e.g.
  // public.service.ts's own OVERLAP_CONSTRAINT_NAMES duplication from
  // appointments.service.ts).
  async getClaimAnalytics(clinicId: string | undefined, startDate: string, endDate: string, user: JwtPayload) {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);

    const claims = await this.prisma.claims.findMany({
      where: {
        submitted_at: { gte: start, lte: end },
        appointment: {
          ...orgScopeVia(user, 'clinic'),
          ...(clinicId ? { clinic_id: clinicId } : {}),
        },
      },
      include: { payer: true, appeal: true },
      orderBy: { submitted_at: 'desc' },
    });

    const totalClaims = claims.length;
    const approvedCount = claims.filter((c) => c.status === 'approved').length;
    const rejectedCount = claims.filter((c) => c.status === 'rejected').length;
    const settledCount = claims.filter((c) => c.status === 'settled').length;
    const pendingCount = claims.filter((c) => ['submitted', 'under_review'].includes(c.status)).length;
    const decidedCount = approvedCount + rejectedCount + settledCount;
    const approvalRate = decidedCount ? ((approvedCount + settledCount) / decidedCount) * 100 : 0;

    const totalClaimAmount = claims.reduce((sum, c) => sum + c.claim_amount, 0) / 100;
    const totalApprovedAmount = claims.reduce((sum, c) => sum + (c.approved_amount ?? 0), 0) / 100;
    const recoveryRate = totalClaimAmount ? (totalApprovedAmount / totalClaimAmount) * 100 : 0;

    // Real category from each rejected claim's own drafted appeal
    // (P2-03) -- a rejected claim predating that slice has no appeal row
    // and is deliberately excluded rather than mis-bucketed into 'other'.
    const denialCounts = new Map<DenialCategory, number>();
    for (const c of claims) {
      if (c.status !== 'rejected' || !c.appeal) continue;
      const category = c.appeal.denial_category as DenialCategory;
      denialCounts.set(category, (denialCounts.get(category) ?? 0) + 1);
    }
    const denialCategoryBreakdown = [...denialCounts.entries()].map(([category, count]) => ({
      category,
      categoryLabel: DENIAL_CATEGORY_LABELS[category] ?? category,
      count,
    }));

    const payerMap = new Map<string, { payerId: string; payerName: string; claims: typeof claims }>();
    for (const c of claims) {
      const entry = payerMap.get(c.payer_id) ?? { payerId: c.payer_id, payerName: c.payer.name, claims: [] };
      entry.claims.push(c);
      payerMap.set(c.payer_id, entry);
    }
    const payerScorecards = [...payerMap.values()]
      .map(({ payerId, payerName, claims: payerClaims }) => {
        const pApproved = payerClaims.filter((c) => c.status === 'approved').length;
        const pRejected = payerClaims.filter((c) => c.status === 'rejected').length;
        const pSettled = payerClaims.filter((c) => c.status === 'settled').length;
        const pPending = payerClaims.filter((c) => ['submitted', 'under_review'].includes(c.status)).length;
        const pDecided = pApproved + pRejected + pSettled;
        const decidedClaims = payerClaims.filter((c) => c.decided_at != null);
        const avgDecisionDays = decidedClaims.length
          ? decidedClaims.reduce((sum, c) => sum + (c.decided_at!.getTime() - c.submitted_at.getTime()), 0) /
            decidedClaims.length /
            (24 * 60 * 60 * 1000)
          : undefined;
        const pClaimAmount = payerClaims.reduce((sum, c) => sum + c.claim_amount, 0) / 100;
        const pApprovedAmount = payerClaims.reduce((sum, c) => sum + (c.approved_amount ?? 0), 0) / 100;
        return {
          payerId,
          payerName,
          totalClaims: payerClaims.length,
          approvedCount: pApproved,
          rejectedCount: pRejected,
          pendingCount: pPending,
          approvalRate: pDecided ? ((pApproved + pSettled) / pDecided) * 100 : 0,
          avgDecisionDays,
          totalClaimAmount: pClaimAmount,
          totalApprovedAmount: pApprovedAmount,
          recoveryRate: pClaimAmount ? (pApprovedAmount / pClaimAmount) * 100 : 0,
        };
      })
      .sort((a, b) => b.totalClaims - a.totalClaims);

    return {
      totalClaims,
      approvedCount,
      rejectedCount,
      settledCount,
      pendingCount,
      approvalRate,
      totalClaimAmount,
      totalApprovedAmount,
      recoveryRate,
      denialCategoryBreakdown,
      payerScorecards,
    };
  }
}
