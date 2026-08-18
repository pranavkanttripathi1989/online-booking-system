import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: {
    clinics: { findMany: jest.Mock };
    appointments: { findMany: jest.Mock };
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
});
