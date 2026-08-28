import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { isPlatformOperator, orgScope, orgScopeVia } from '../common/scoping/tenant-scope';

const PAISE_TO_RUPEES = (paise: number) => paise / 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const SLOT_MINUTES = 30;

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};

const isoDate = (d: Date) => startOfDay(d).toISOString().slice(0, 10);

// BUG042 -- same fix as analytics.service.ts's own pctChange (BUG035): a
// prior period with no recorded activity has no real percent change to
// report. null means "nothing to compare against", not a fabricated flat
// 100/0 regardless of current's real magnitude.
const pctChange = (current: number, previous: number): number | null => {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // BUG006: all four scopes below were the F-01 ternary, returning `{}` — every
  // tenant — for an org-less caller. They now fail closed via the shared helper.
  private appointmentOrgScope(user: JwtPayload) {
    return orgScopeVia(user, 'clinic');
  }

  private clinicianOrgScope(user: JwtPayload) {
    return orgScopeVia(user, 'clinic');
  }

  // Same via-appointments-OR-no-appointments-yet pattern as patients.service.ts's
  // orgScope() — Patients has no client_org_id column of its own.
  private patientOrgScope(user: JwtPayload) {
    if (isPlatformOperator(user)) return {};
    // Non-operator with no org falls through to the sentinel, matching nothing,
    // rather than to `{}`, matching everything.
    const scope = orgScopeVia(user, 'clinic');
    return {
      OR: [
        { appointments: { some: scope } },
        { appointments: { none: {} } },
      ],
    };
  }

  private paymentOrgScope(user: JwtPayload) {
    return orgScope(user);
  }

  async getDashboard(user: JwtPayload) {
    const now = new Date();
    const todayStart = startOfDay(now);
    const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);

    const [
      appointmentsToday,
      appointmentsYesterday,
      appointmentsWeek,
      appointmentsMonth,
      totalClinicians,
      cliniciansThirtyDaysAgo,
      totalPatients,
      patientsThirtyDaysAgo,
      revenueThisMonthRows,
      revenueLastMonthRows,
      noShowWindow,
      upcoming,
      utilisation,
      volumeByDay,
      bookingsByService,
    ] = await Promise.all([
      this.prisma.appointments.count({
        where: { is_deleted: false, ...this.appointmentOrgScope(user), appointment_time: { gte: todayStart } },
      }),
      this.prisma.appointments.count({
        where: {
          is_deleted: false,
          ...this.appointmentOrgScope(user),
          appointment_time: { gte: yesterdayStart, lt: todayStart },
        },
      }),
      this.prisma.appointments.count({
        where: { is_deleted: false, ...this.appointmentOrgScope(user), appointment_time: { gte: sevenDaysAgo } },
      }),
      this.prisma.appointments.count({
        where: { is_deleted: false, ...this.appointmentOrgScope(user), appointment_time: { gte: monthStart } },
      }),
      this.prisma.clinicians.count({
        where: { is_active: true, is_deleted: false, ...this.clinicianOrgScope(user) },
      }),
      this.prisma.clinicians.count({
        where: { is_deleted: false, ...this.clinicianOrgScope(user), created_at: { lte: thirtyDaysAgo } },
      }),
      this.prisma.patients.count({ where: { is_deleted: false, ...this.patientOrgScope(user) } }),
      this.prisma.patients.count({
        where: { is_deleted: false, ...this.patientOrgScope(user), created_at: { lte: thirtyDaysAgo } },
      }),
      this.prisma.appointmentPayments.findMany({
        where: { ...this.paymentOrgScope(user), status: 'succeeded', created_at: { gte: monthStart } },
        select: { amount: true },
      }),
      this.prisma.appointmentPayments.findMany({
        where: {
          ...this.paymentOrgScope(user),
          status: 'succeeded',
          created_at: { gte: prevMonthStart, lt: monthStart },
        },
        select: { amount: true },
      }),
      this.prisma.appointments.findMany({
        where: {
          is_deleted: false,
          ...this.appointmentOrgScope(user),
          appointment_time: { gte: thirtyDaysAgo },
          status: { in: ['completed', 'no_show'] },
        },
        select: { status: true },
      }),
      this.prisma.appointments.findMany({
        where: {
          is_deleted: false,
          ...this.appointmentOrgScope(user),
          appointment_time: { gte: now },
          status: { not: 'cancelled' },
        },
        orderBy: { appointment_time: 'asc' },
        take: 5,
        include: { patient: true, clinician: true, product: true },
      }),
      this.getUtilisationByClinician(user, sevenDaysAgo, now),
      this.prisma.appointments.findMany({
        where: { is_deleted: false, ...this.appointmentOrgScope(user), appointment_time: { gte: thirtyDaysAgo } },
        select: { appointment_time: true, status: true },
      }),
      this.prisma.appointments.findMany({
        where: { is_deleted: false, ...this.appointmentOrgScope(user), appointment_time: { gte: thirtyDaysAgo } },
        select: { product: { select: { name: true } } },
      }),
    ]);

    const revenueThisMonth = revenueThisMonthRows.reduce((sum, r) => sum + r.amount, 0);
    const revenueLastMonth = revenueLastMonthRows.reduce((sum, r) => sum + r.amount, 0);

    const noShowCount = noShowWindow.filter((a) => a.status === 'no_show').length;
    const noShowRate = noShowWindow.length ? (noShowCount / noShowWindow.length) * 100 : 0;

    const volumeMap = new Map<string, { confirmed_count: number; cancelled_count: number }>();
    for (let t = thirtyDaysAgo.getTime(); t <= now.getTime(); t += DAY_MS) {
      volumeMap.set(isoDate(new Date(t)), { confirmed_count: 0, cancelled_count: 0 });
    }
    for (const a of volumeByDay) {
      const key = isoDate(a.appointment_time);
      const entry = volumeMap.get(key);
      if (!entry) continue;
      if (a.status === 'cancelled') entry.cancelled_count++;
      else entry.confirmed_count++;
    }

    const serviceMap = new Map<string, number>();
    for (const a of bookingsByService) {
      const name = a.product?.name ?? 'Other';
      serviceMap.set(name, (serviceMap.get(name) ?? 0) + 1);
    }

    return {
      total_appointments_today: appointmentsToday,
      total_appointments_today_change: pctChange(appointmentsToday, appointmentsYesterday),
      total_appointments_week: appointmentsWeek,
      total_appointments_month: appointmentsMonth,
      total_clinicians: totalClinicians,
      total_clinicians_change: pctChange(totalClinicians, cliniciansThirtyDaysAgo),
      total_patients: totalPatients,
      total_patients_change: pctChange(totalPatients, patientsThirtyDaysAgo),
      total_revenue_month: PAISE_TO_RUPEES(revenueThisMonth),
      total_revenue_month_change: pctChange(revenueThisMonth, revenueLastMonth),
      no_show_rate: noShowRate,
      upcoming_appointments: upcoming.map((a) => {
        const start = a.appointment_time;
        const end = new Date(start.getTime() + a.duration_minutes * 60000);
        return {
          id: a.id,
          start_datetime: start,
          end_datetime: end,
          status: a.status,
          patient: { id: a.patient.id, full_name: `${a.patient.first_name} ${a.patient.last_name}` },
          clinician: { id: a.clinician.id, full_name: `${a.clinician.first_name} ${a.clinician.last_name}` },
          service: a.product ? { id: a.product.id, name: a.product.name } : undefined,
        };
      }),
      utilisation_by_clinician: utilisation,
      volume_by_day: [...volumeMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, ...v })),
      bookings_by_service: [...serviceMap.entries()]
        .sort(([, a], [, b]) => b - a)
        .map(([service_name, count]) => ({ service_name, count })),
    };
  }

  // Deliberately simplified — see PLAN014/REQ007. slots_available counts
  // ClinicianAvailability minutes / 30 for daily+weekly recurrence windows
  // falling inside [from, to]; monthly/custom recurrence and lunch-break/
  // block exclusion are not handled, matching analytics.entity.ts's own
  // documented utilisation-proxy precedent rather than inventing a stricter
  // one-off standard here.
  private async getUtilisationByClinician(user: JwtPayload, from: Date, to: Date) {
    const clinicians = await this.prisma.clinicians.findMany({
      where: { is_active: true, is_deleted: false, ...this.clinicianOrgScope(user) },
      include: {
        availability: { where: { is_active: true, is_deleted: false } },
        appointments: {
          where: { is_deleted: false, status: { not: 'cancelled' }, appointment_time: { gte: from, lte: to } },
          select: { id: true },
        },
      },
    });

    return clinicians.map((c) => {
      const slotsBooked = c.appointments.length;

      let availableMinutes = 0;
      for (let t = startOfDay(from).getTime(); t <= to.getTime(); t += DAY_MS) {
        const day = new Date(t);
        const dow = day.getUTCDay();
        for (const row of c.availability) {
          if (row.recurrence_type === 'daily') {
            availableMinutes += minutesBetween(row.start_time, row.end_time);
          } else if (row.recurrence_type === 'weekly' && row.day_of_week === dow) {
            availableMinutes += minutesBetween(row.start_time, row.end_time);
          }
        }
      }
      const slotsAvailable = availableMinutes > 0 ? Math.round(availableMinutes / SLOT_MINUTES) : Math.max(slotsBooked, 1);
      const utilisationPercent = slotsAvailable > 0 ? Math.min(100, (slotsBooked / slotsAvailable) * 100) : 0;

      return {
        clinician: {
          id: c.id,
          full_name: `${c.first_name} ${c.last_name}`,
          avatar_url: c.avatar_url ?? undefined,
          clinician_type: c.clinician_type ? { name: c.clinician_type } : undefined,
        },
        slots_available: slotsAvailable,
        slots_booked: slotsBooked,
        utilisation_percent: utilisationPercent,
      };
    });
  }
}

// ClinicianAvailability.start_time/end_time are "HH:MM" strings, not DateTimes.
function minutesBetween(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return minutes > 0 ? minutes : 0;
}
