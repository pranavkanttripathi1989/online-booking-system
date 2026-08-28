import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: {
    clinics: { findMany: jest.Mock };
    appointments: { findMany: jest.Mock; groupBy: jest.Mock };
    clinicians: { findMany: jest.Mock };
    patients: { findMany: jest.Mock };
    claims: { findMany: jest.Mock };
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
      appointments: { findMany: jest.fn(), groupBy: jest.fn().mockResolvedValue([]) },
      // REQ029 — computeTrueUtilisation()'s own read. Defaults to no
      // clinicians in scope, which makes it return null and fall back to
      // the completion-rate proxy, preserving every pre-existing test's
      // expectations below unchanged; the new "true utilisation" describe
      // block further down overrides this per-case.
      clinicians: { findMany: jest.fn().mockResolvedValue([]) },
      patients: { findMany: jest.fn().mockResolvedValue([]) },
      claims: { findMany: jest.fn().mockResolvedValue([]) },
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
      // BUG035 -- no previous-period data means no real percent change to
      // report, not a fabricated flat 100. This test used to assert 100,
      // pinning the bug in place.
      expect(stats.trends.totalAppointments).toBeNull();
    });

    it('reports zeroed stats without dividing by zero when there are no appointments in range', async () => {
      prisma.appointments.findMany.mockResolvedValue([]);
      const stats = await service.getAppointmentStats(undefined, '2026-08-10', '2026-08-10', managerUser);
      expect(stats.totalAppointments).toBe(0);
      expect(stats.cancellationRate).toBe(0);
      expect(stats.utilization).toBe(0);
      // BUG035 -- zero and zero: no baseline to compare against either.
      expect(stats.trends.totalAppointments).toBeNull();
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

  // REQ029 (US-RPT-02).
  describe('getPatientReportGroup', () => {
    it('scopes the in-range patient lookup to the caller org', async () => {
      prisma.patients.findMany.mockResolvedValueOnce([]);
      await service.getPatientReportGroup(undefined, '2026-08-01', '2026-08-31', 90, managerUser);
      const call = prisma.patients.findMany.mock.calls[0][0];
      expect(call.where.appointments.some.clinic).toEqual({ client_org_id: 'org-1' });
    });

    it('classifies a patient with a prior visit before the range as repeat, one with none as new', async () => {
      prisma.patients.findMany.mockResolvedValueOnce([
        { id: 'p-new', acquisition_source: 'referral' },
        { id: 'p-repeat', acquisition_source: 'walk_in' },
      ]);
      prisma.appointments.groupBy.mockResolvedValueOnce([{ patient_id: 'p-repeat', _count: { id: 2 } }]);
      prisma.patients.findMany.mockResolvedValueOnce([]); // lapsed-candidates call
      const result = await service.getPatientReportGroup(undefined, '2026-08-01', '2026-08-31', 90, managerUser);
      expect(result.newPatients).toBe(1);
      expect(result.repeatPatients).toBe(1);
    });

    it('buckets acquisition source, defaulting a missing value to "unknown"', async () => {
      prisma.patients.findMany.mockResolvedValueOnce([
        { id: 'p1', acquisition_source: 'referral' },
        { id: 'p2', acquisition_source: 'referral' },
        { id: 'p3', acquisition_source: null },
      ]);
      prisma.appointments.groupBy.mockResolvedValueOnce([]);
      prisma.patients.findMany.mockResolvedValueOnce([]);
      const result = await service.getPatientReportGroup(undefined, '2026-08-01', '2026-08-31', 90, managerUser);
      expect(result.acquisitionSourceBreakdown).toEqual(
        expect.arrayContaining([{ source: 'referral', count: 2 }, { source: 'unknown', count: 1 }]),
      );
    });

    it('surfaces a lapsed patient with their most recent visit date', async () => {
      prisma.patients.findMany.mockResolvedValueOnce([]); // in-range call
      prisma.patients.findMany.mockResolvedValueOnce([
        { id: 'p-lapsed', first_name: 'Old', last_name: 'Patient', appointments: [{ appointment_time: new Date('2026-01-01') }] },
      ]);
      const result = await service.getPatientReportGroup(undefined, '2026-08-01', '2026-08-31', 90, managerUser);
      expect(result.lapsedPatients).toEqual([{ id: 'p-lapsed', full_name: 'Old Patient', last_visit: new Date('2026-01-01') }]);
    });
  });

  // P2-04
  describe('getClaimAnalytics', () => {
    const claim = (overrides: Partial<Record<string, unknown>> = {}) => ({
      id: 'claim-1',
      payer_id: 'payer-1',
      payer: { id: 'payer-1', name: 'Star Health' },
      claim_amount: 500000, // 5000 rupees
      approved_amount: null,
      status: 'submitted',
      submitted_at: new Date('2026-08-10T00:00:00.000Z'),
      decided_at: null,
      appeal: null,
      ...overrides,
    });

    it('scopes the claims lookup to the caller org via the 2-level appointment.clinic nesting', async () => {
      prisma.claims.findMany.mockResolvedValueOnce([]);
      await service.getClaimAnalytics(undefined, '2026-08-01', '2026-08-31', managerUser);
      const call = prisma.claims.findMany.mock.calls[0][0];
      expect(call.where.appointment.clinic).toEqual({ client_org_id: 'org-1' });
    });

    it('filters by clinicId when supplied, in addition to org scope', async () => {
      prisma.claims.findMany.mockResolvedValueOnce([]);
      await service.getClaimAnalytics('clinic-9', '2026-08-01', '2026-08-31', managerUser);
      const call = prisma.claims.findMany.mock.calls[0][0];
      expect(call.where.appointment.clinic_id).toBe('clinic-9');
    });

    it('counts claims by status and computes the approval rate over decided claims only', async () => {
      prisma.claims.findMany.mockResolvedValueOnce([
        claim({ id: 'c1', status: 'approved', approved_amount: 480000, decided_at: new Date('2026-08-12') }),
        claim({ id: 'c2', status: 'rejected', appeal: { denial_category: 'missing_documentation' } }),
        claim({ id: 'c3', status: 'settled', approved_amount: 500000, decided_at: new Date('2026-08-15') }),
        claim({ id: 'c4', status: 'submitted' }),
      ]);
      const result = await service.getClaimAnalytics(undefined, '2026-08-01', '2026-08-31', managerUser);
      expect(result.totalClaims).toBe(4);
      expect(result.approvedCount).toBe(1);
      expect(result.rejectedCount).toBe(1);
      expect(result.settledCount).toBe(1);
      expect(result.pendingCount).toBe(1);
      // decided = approved + rejected + settled = 3; approved+settled = 2
      expect(result.approvalRate).toBeCloseTo((2 / 3) * 100);
    });

    it('converts claim/approved amounts from paise to rupees and computes recovery rate', async () => {
      prisma.claims.findMany.mockResolvedValueOnce([
        claim({ claim_amount: 1000000, approved_amount: 800000, status: 'approved' }),
      ]);
      const result = await service.getClaimAnalytics(undefined, '2026-08-01', '2026-08-31', managerUser);
      expect(result.totalClaimAmount).toBe(10000);
      expect(result.totalApprovedAmount).toBe(8000);
      expect(result.recoveryRate).toBeCloseTo(80);
    });

    it('returns a zero approval/recovery rate rather than NaN when there are no claims', async () => {
      prisma.claims.findMany.mockResolvedValueOnce([]);
      const result = await service.getClaimAnalytics(undefined, '2026-08-01', '2026-08-31', managerUser);
      expect(result.approvalRate).toBe(0);
      expect(result.recoveryRate).toBe(0);
      expect(result.totalClaims).toBe(0);
    });

    it('builds the denial category breakdown from each rejected claim\'s own drafted appeal', async () => {
      prisma.claims.findMany.mockResolvedValueOnce([
        claim({ id: 'c1', status: 'rejected', appeal: { denial_category: 'coding_mismatch' } }),
        claim({ id: 'c2', status: 'rejected', appeal: { denial_category: 'coding_mismatch' } }),
        claim({ id: 'c3', status: 'rejected', appeal: { denial_category: 'not_covered' } }),
      ]);
      const result = await service.getClaimAnalytics(undefined, '2026-08-01', '2026-08-31', managerUser);
      expect(result.denialCategoryBreakdown).toEqual(
        expect.arrayContaining([
          { category: 'coding_mismatch', categoryLabel: 'Coding mismatch', count: 2 },
          { category: 'not_covered', categoryLabel: 'Not covered under policy', count: 1 },
        ]),
      );
    });

    it('excludes a rejected claim with no drafted appeal, rather than mis-bucketing it', async () => {
      prisma.claims.findMany.mockResolvedValueOnce([claim({ status: 'rejected', appeal: null })]);
      const result = await service.getClaimAnalytics(undefined, '2026-08-01', '2026-08-31', managerUser);
      expect(result.denialCategoryBreakdown).toEqual([]);
    });

    it('never counts an approved/settled/pending claim toward the denial breakdown', async () => {
      prisma.claims.findMany.mockResolvedValueOnce([
        claim({ status: 'approved', appeal: null }),
        claim({ status: 'submitted', appeal: null }),
      ]);
      const result = await service.getClaimAnalytics(undefined, '2026-08-01', '2026-08-31', managerUser);
      expect(result.denialCategoryBreakdown).toEqual([]);
    });

    it('builds one scorecard per payer, sorted by total claims descending', async () => {
      prisma.claims.findMany.mockResolvedValueOnce([
        claim({ id: 'c1', payer_id: 'payer-a', payer: { id: 'payer-a', name: 'Star Health' }, status: 'approved', approved_amount: 400000 }),
        claim({ id: 'c2', payer_id: 'payer-a', payer: { id: 'payer-a', name: 'Star Health' }, status: 'rejected' }),
        claim({ id: 'c3', payer_id: 'payer-b', payer: { id: 'payer-b', name: 'HDFC Ergo' }, status: 'approved', approved_amount: 500000 }),
      ]);
      const result = await service.getClaimAnalytics(undefined, '2026-08-01', '2026-08-31', managerUser);
      expect(result.payerScorecards).toHaveLength(2);
      expect(result.payerScorecards[0]).toMatchObject({ payerId: 'payer-a', payerName: 'Star Health', totalClaims: 2 });
      expect(result.payerScorecards[1]).toMatchObject({ payerId: 'payer-b', payerName: 'HDFC Ergo', totalClaims: 1 });
    });

    it('computes avgDecisionDays only from claims that have actually been decided', async () => {
      prisma.claims.findMany.mockResolvedValueOnce([
        claim({
          status: 'approved',
          submitted_at: new Date('2026-08-01T00:00:00.000Z'),
          decided_at: new Date('2026-08-04T00:00:00.000Z'),
        }),
        claim({ status: 'submitted' }),
      ]);
      const result = await service.getClaimAnalytics(undefined, '2026-08-01', '2026-08-31', managerUser);
      expect(result.payerScorecards[0].avgDecisionDays).toBeCloseTo(3);
    });

    it('leaves avgDecisionDays undefined, not zero, when no claim from a payer has been decided yet', async () => {
      prisma.claims.findMany.mockResolvedValueOnce([claim({ status: 'submitted' })]);
      const result = await service.getClaimAnalytics(undefined, '2026-08-01', '2026-08-31', managerUser);
      expect(result.payerScorecards[0].avgDecisionDays).toBeUndefined();
    });
  });
});
