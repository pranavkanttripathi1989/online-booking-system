import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: {
    clinics: { findMany: jest.Mock };
    appointments: { findMany: jest.Mock };
    clinicians: { findMany: jest.Mock };
  };

  const managerUser: JwtPayload = { sub: 'user-1', roles: ['manager'], client_org_id: 'org-1' } as JwtPayload;
  const adminUser: JwtPayload = { sub: 'user-2', roles: ['admin'], client_org_id: null } as JwtPayload;

  const appointment = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'appt-1',
    clinic_id: 'clinic-1',
    clinician_id: 'clinician-1',
    patient_id: 'patient-1',
    status: 'completed',
    appointment_time: new Date('2026-08-10T10:00:00.000Z'),
    clinic: { id: 'clinic-1', name: 'MG Road Clinic', client_org_id: 'org-1' },
    clinician: { id: 'clinician-1', first_name: 'Sarah', last_name: 'Mitchell' },
    product: { price: 50000 }, // 500.00 rupees
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      clinics: { findMany: jest.fn() },
      appointments: { findMany: jest.fn() },
      // REQ029 — computeTrueUtilisation()'s own read. Defaults to no
      // clinicians in scope, which makes it return null and fall back to
      // the completion-rate proxy, preserving every pre-existing test's
      // expectations below unchanged; the new "true utilisation" describe
      // block further down overrides this per-case.
      clinicians: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AnalyticsService);
  });

  describe('getClinics', () => {
    it('scopes to the caller org for a tenant user', async () => {
      prisma.clinics.findMany.mockResolvedValue([]);
      await service.getClinics(managerUser);
      expect(prisma.clinics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-1' }) }),
      );
    });

    it('does not filter by client_org_id for an org-less platform admin', async () => {
      prisma.clinics.findMany.mockResolvedValue([]);
      await service.getClinics(adminUser);
      const where = prisma.clinics.findMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('client_org_id');
    });
  });

  describe('getAppointmentStats — tenant isolation', () => {
    it('every fetch is scoped by clinic.client_org_id for a tenant caller (current + comparison period)', async () => {
      prisma.appointments.findMany.mockResolvedValue([]);
      await service.getAppointmentStats(undefined, '2026-08-01', '2026-08-10', managerUser);
      expect(prisma.appointments.findMany).toHaveBeenCalledTimes(2);
      for (const call of prisma.appointments.findMany.mock.calls) {
        expect(call[0].where.clinic).toEqual({ client_org_id: 'org-1' });
      }
    });

    it('passes no clinic org filter for an org-less platform admin', async () => {
      prisma.appointments.findMany.mockResolvedValue([]);
      await service.getAppointmentStats(undefined, '2026-08-01', '2026-08-10', adminUser);
      for (const call of prisma.appointments.findMany.mock.calls) {
        expect(call[0].where.clinic).toBeUndefined();
      }
    });

    it('applies an explicit clinic_id filter when provided', async () => {
      prisma.appointments.findMany.mockResolvedValue([]);
      await service.getAppointmentStats('clinic-9', '2026-08-01', '2026-08-10', managerUser);
      expect(prisma.appointments.findMany.mock.calls[0][0].where.clinic_id).toBe('clinic-9');
    });
  });

  describe('getAppointmentStats — aggregation correctness', () => {
    it('computes totals, revenue (paise->rupees), cancellation rate and completion-based utilization from real rows', async () => {
      const rows = [
        appointment({ id: 'a1', status: 'completed', product: { price: 50000 } }),
        appointment({ id: 'a2', status: 'completed', product: { price: 30000 }, clinician_id: 'clinician-2', clinician: { id: 'clinician-2', first_name: 'James', last_name: 'Okafor' } }),
        appointment({ id: 'a3', status: 'cancelled', product: { price: 20000 } }),
        appointment({ id: 'a4', status: 'scheduled', product: { price: 10000 } }),
      ];
      // current period call, then previous period call (empty)
      prisma.appointments.findMany.mockResolvedValueOnce(rows).mockResolvedValueOnce([]);

      const stats = await service.getAppointmentStats(undefined, '2026-08-10', '2026-08-10', managerUser);

      expect(stats.totalAppointments).toBe(4);
      expect(stats.revenue).toBe(800); // (500 + 300) rupees from the two completed appointments
      expect(stats.activePatients).toBe(1); // same patient_id on every fixture row
      expect(stats.cancellationRate).toBe(25); // 1 of 4
      expect(stats.utilization).toBe(50); // 2 of 4 completed
      expect(stats.topClinicians).toHaveLength(2);
      expect(stats.revenueByClinic).toEqual([{ name: 'MG Road Clinic', revenue: 800 }]);
      // no previous-period data => trend reported as a flat 100% increase from zero
      expect(stats.trends.totalAppointments).toBe(100);
    });

    it('reports zeroed stats without dividing by zero when there are no appointments in range', async () => {
      prisma.appointments.findMany.mockResolvedValue([]);
      const stats = await service.getAppointmentStats(undefined, '2026-08-10', '2026-08-10', managerUser);
      expect(stats.totalAppointments).toBe(0);
      expect(stats.cancellationRate).toBe(0);
      expect(stats.utilization).toBe(0);
      expect(stats.trends.totalAppointments).toBe(0);
    });

    it('buckets timeSeriesData by day across the requested range', async () => {
      const rows = [
        appointment({ id: 'a1', status: 'completed', appointment_time: new Date('2026-08-01T09:00:00.000Z') }),
        appointment({ id: 'a2', status: 'cancelled', appointment_time: new Date('2026-08-02T09:00:00.000Z') }),
      ];
      prisma.appointments.findMany.mockResolvedValueOnce(rows).mockResolvedValueOnce([]);

      const stats = await service.getAppointmentStats(undefined, '2026-08-01', '2026-08-02', managerUser);

      expect(stats.timeSeriesData).toHaveLength(2);
      expect(stats.timeSeriesData[0]).toMatchObject({ completed: 1, cancelled: 0 });
      expect(stats.timeSeriesData[1]).toMatchObject({ completed: 0, cancelled: 1 });
    });
  });

  // REQ029 (US-RPT-01) — real slot-capacity utilisation, replacing the
  // completion-rate proxy. Hand-computed fixtures, not snapshots.
  describe('getAppointmentStats — true utilisation (REQ029, US-RPT-01)', () => {
    const dailyWindow = (start: string, end: string) => ({
      day_of_week: null,
      recurrence_type: 'daily',
      start_time: start,
      end_time: end,
      valid_from: new Date('2026-01-01T00:00:00.000Z'),
      valid_until: null,
    });

    it('computes booked minutes over available minutes from real availability data, not the completion-rate proxy', async () => {
      prisma.clinicians.findMany.mockResolvedValue([
        { id: 'clinician-1', availability: [dailyWindow('09:00', '17:00')], lunchBreaks: [], spacerBlocks: [] },
      ]);
      const rows = [
        appointment({ id: 'a1', status: 'completed', duration_minutes: 60 }),
        appointment({ id: 'a2', status: 'scheduled', duration_minutes: 60 }),
        appointment({ id: 'a3', status: 'cancelled', duration_minutes: 60 }), // excluded — never occupied a slot
      ];
      prisma.appointments.findMany.mockResolvedValueOnce(rows).mockResolvedValueOnce([]);

      const stats = await service.getAppointmentStats(undefined, '2026-08-10', '2026-08-10', managerUser);

      // available = 480 min (one 8h window, one day, no busy time); booked = 120 min
      expect(stats.utilization).toBe(25);
    });

    it('subtracts lunch breaks from available minutes', async () => {
      prisma.clinicians.findMany.mockResolvedValue([
        {
          id: 'clinician-1',
          availability: [dailyWindow('09:00', '17:00')],
          lunchBreaks: [
            { day_of_week: null, recurrence_type: 'daily', start_time: new Date('1970-01-01T13:00:00.000Z'), end_time: new Date('1970-01-01T14:00:00.000Z') },
          ],
          spacerBlocks: [],
        },
      ]);
      const rows = [appointment({ id: 'a1', status: 'completed', duration_minutes: 60 })];
      prisma.appointments.findMany.mockResolvedValueOnce(rows).mockResolvedValueOnce([]);

      const stats = await service.getAppointmentStats(undefined, '2026-08-10', '2026-08-10', managerUser);

      // available = 480 - 60 (lunch) = 420 min; booked = 60 min
      expect(stats.utilization).toBeCloseTo((60 / 420) * 100, 5);
    });

    it('subtracts a same-day spacer block from available minutes', async () => {
      prisma.clinicians.findMany.mockResolvedValue([
        {
          id: 'clinician-1',
          availability: [dailyWindow('09:00', '17:00')],
          lunchBreaks: [],
          spacerBlocks: [
            { block_date: new Date('2026-08-10T00:00:00.000Z'), start_time: new Date('1970-01-01T11:00:00.000Z'), end_time: new Date('1970-01-01T11:30:00.000Z') },
          ],
        },
      ]);
      const rows = [appointment({ id: 'a1', status: 'completed', duration_minutes: 60 })];
      prisma.appointments.findMany.mockResolvedValueOnce(rows).mockResolvedValueOnce([]);

      const stats = await service.getAppointmentStats(undefined, '2026-08-10', '2026-08-10', managerUser);

      // available = 480 - 30 (spacer) = 450 min; booked = 60 min
      expect(stats.utilization).toBeCloseTo((60 / 450) * 100, 5);
    });

    it('clamps utilisation at 100% when booked minutes exceed available minutes', async () => {
      prisma.clinicians.findMany.mockResolvedValue([
        { id: 'clinician-1', availability: [dailyWindow('09:00', '10:00')], lunchBreaks: [], spacerBlocks: [] },
      ]);
      const rows = [appointment({ id: 'a1', status: 'completed', duration_minutes: 120 })]; // double the 60-min window
      prisma.appointments.findMany.mockResolvedValueOnce(rows).mockResolvedValueOnce([]);

      const stats = await service.getAppointmentStats(undefined, '2026-08-10', '2026-08-10', managerUser);

      expect(stats.utilization).toBe(100);
    });

    it('falls back to the completion-rate proxy when there is no availability data in scope at all', async () => {
      prisma.clinicians.findMany.mockResolvedValue([]);
      const rows = [
        appointment({ id: 'a1', status: 'completed' }),
        appointment({ id: 'a2', status: 'scheduled' }),
      ];
      prisma.appointments.findMany.mockResolvedValueOnce(rows).mockResolvedValueOnce([]);

      const stats = await service.getAppointmentStats(undefined, '2026-08-10', '2026-08-10', managerUser);

      expect(stats.utilization).toBe(50); // 1 of 2 completed — the old proxy, used only as a fallback
    });

    it('scopes the clinicians it walks by the same org/clinic filter as the appointments query', async () => {
      prisma.clinicians.findMany.mockResolvedValue([]);
      prisma.appointments.findMany.mockResolvedValue([]);
      await service.getAppointmentStats('clinic-9', '2026-08-10', '2026-08-10', managerUser);
      const call = prisma.clinicians.findMany.mock.calls[0][0];
      expect(call.where.clinic_id).toBe('clinic-9');
      expect(call.where.clinic).toEqual({ client_org_id: 'org-1' });
    });
  });
});
