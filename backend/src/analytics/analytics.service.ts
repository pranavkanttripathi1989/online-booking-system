import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

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

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private orgScope(user: JwtPayload) {
    return user.client_org_id ? { clinic: { client_org_id: user.client_org_id } } : {};
  }

  async getClinics(user: JwtPayload) {
    return this.prisma.clinics.findMany({
      where: { is_deleted: false, ...(user.client_org_id ? { client_org_id: user.client_org_id } : {}) },
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
    // Completion-rate proxy for "utilization" -- see entities/analytics.entity.ts comment.
    const utilization = total ? (completed.length / total) * 100 : 0;
    return { total, revenue, activePatients, cancellationRate, utilization };
  }

  private pctChange(current: number, previous: number) {
    if (!previous) return current ? 100 : 0;
    return ((current - previous) / previous) * 100;
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
      utilization: current.utilization,
      cancellationRate: current.cancellationRate,
      trends: {
        totalAppointments: this.pctChange(current.total, previous.total),
        revenue: this.pctChange(current.revenue, previous.revenue),
        activePatients: this.pctChange(current.activePatients, previous.activePatients),
        utilization: this.pctChange(current.utilization, previous.utilization),
        cancellationRate: this.pctChange(current.cancellationRate, previous.cancellationRate),
      },
      timeSeriesData,
      statusDistribution,
      revenueByClinic,
      topClinicians,
    };
  }
}
