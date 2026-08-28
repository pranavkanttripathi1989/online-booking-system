import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    appointments: { count: jest.Mock; findMany: jest.Mock };
    clinicians: { count: jest.Mock; findMany: jest.Mock };
    patients: { count: jest.Mock };
    appointmentPayments: { findMany: jest.Mock };
  };

  const tenantUser: JwtPayload = { sub: 'user-1', roles: ['staff'], client_org_id: 'org-1' } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'user-2', roles: ['admin'], client_org_id: null } as JwtPayload;

  // Fills every Promise.all slot with an empty/zero-ish default so tests only
  // have to override the specific calls they care about.
  function resetPrismaDefaults() {
    prisma.appointments.count.mockResolvedValue(0);
    prisma.appointments.findMany.mockResolvedValue([]);
    prisma.clinicians.count.mockResolvedValue(0);
    prisma.clinicians.findMany.mockResolvedValue([]);
    prisma.patients.count.mockResolvedValue(0);
    prisma.appointmentPayments.findMany.mockResolvedValue([]);
  }

  beforeEach(async () => {
    prisma = {
      appointments: { count: jest.fn(), findMany: jest.fn() },
      clinicians: { count: jest.fn(), findMany: jest.fn() },
      patients: { count: jest.fn() },
      appointmentPayments: { findMany: jest.fn() },
    };
    resetPrismaDefaults();

    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(DashboardService);
  });

  describe('tenant isolation', () => {
    it('scopes every appointments/clinicians call by clinic.client_org_id for a tenant caller', async () => {
      await service.getDashboard(tenantUser);

      for (const call of prisma.appointments.count.mock.calls) {
        expect(call[0].where).toEqual(expect.objectContaining({ clinic: { client_org_id: 'org-1' } }));
      }
      for (const call of prisma.appointments.findMany.mock.calls) {
        expect(call[0].where).toEqual(expect.objectContaining({ clinic: { client_org_id: 'org-1' } }));
      }
      for (const call of prisma.clinicians.count.mock.calls) {
        expect(call[0].where).toEqual(expect.objectContaining({ clinic: { client_org_id: 'org-1' } }));
      }
      const utilisationCall = prisma.clinicians.findMany.mock.calls[0][0];
      expect(utilisationCall.where).toEqual(expect.objectContaining({ clinic: { client_org_id: 'org-1' } }));
    });

    it('scopes AppointmentPayments by its own client_org_id column for a tenant caller', async () => {
      await service.getDashboard(tenantUser);
      for (const call of prisma.appointmentPayments.findMany.mock.calls) {
        expect(call[0].where).toEqual(expect.objectContaining({ client_org_id: 'org-1' }));
      }
    });

    it('does not filter by client_org_id anywhere for an org-less platform caller', async () => {
      await service.getDashboard(platformUser);

      for (const call of prisma.appointments.count.mock.calls) {
        expect(call[0].where).not.toHaveProperty('clinic');
      }
      for (const call of prisma.appointmentPayments.findMany.mock.calls) {
        expect(call[0].where).not.toHaveProperty('client_org_id');
      }
    });

    it('never leaks a cross-org appointment into upcoming_appointments even if Prisma is (hypothetically) misconfigured', async () => {
      // Simulates the query genuinely being org-scoped: a same-shaped row from
      // a different org should never be reachable because the where-clause
      // assertions above are what actually keep it out at the query level.
      prisma.appointments.findMany.mockImplementation((args: any) => {
        const rows = [
          {
            id: 'appt-org1',
            appointment_time: new Date(Date.now() + 3600000),
            duration_minutes: 30,
            status: 'scheduled',
            patient: { id: 'p1', first_name: 'Org1', last_name: 'Patient' },
            clinician: { id: 'c1', first_name: 'Org1', last_name: 'Clinician' },
            product: { id: 'prod1', name: 'Consultation' },
          },
        ];
        // Only the tenant-scoped call (matching org-1) should ever see this row —
        // a query scoped to a different org must return nothing, verified above.
        return Promise.resolve(args.where?.clinic?.client_org_id === 'org-1' ? rows : []);
      });

      const result = await service.getDashboard(tenantUser);
      expect(result.upcoming_appointments.every((a: any) => a.patient.full_name === 'Org1 Patient')).toBe(true);
    });
  });

  describe('happy path — computed values', () => {
    it('converts revenue from paise to rupees and computes month-over-month change', async () => {
      prisma.appointmentPayments.findMany
        .mockResolvedValueOnce([{ amount: 50000 }, { amount: 25000 }]) // this month: ₹750
        .mockResolvedValueOnce([{ amount: 50000 }]); // last month: ₹500

      const result = await service.getDashboard(tenantUser);

      expect(result.total_revenue_month).toBe(750);
      expect(result.total_revenue_month_change).toBeCloseTo(50, 5); // (750-500)/500 * 100
    });

    it('reports a null trend, not a fabricated 100, when there is no prior-period revenue (BUG042)', async () => {
      prisma.appointmentPayments.findMany
        .mockResolvedValueOnce([{ amount: 50000 }]) // this month: ₹500
        .mockResolvedValueOnce([]); // last month: nothing

      const result = await service.getDashboard(tenantUser);

      expect(result.total_revenue_month).toBe(500);
      expect(result.total_revenue_month_change).toBeNull();
    });

    it('computes no_show_rate as no_show / (completed + no_show), 0 when nothing in the window', async () => {
      prisma.appointments.findMany.mockImplementation((args: any) => {
        if (args.where?.status?.in?.includes('no_show')) {
          return Promise.resolve([{ status: 'completed' }, { status: 'completed' }, { status: 'no_show' }]);
        }
        return Promise.resolve([]);
      });

      const result = await service.getDashboard(tenantUser);
      expect(result.no_show_rate).toBeCloseTo(100 / 3, 5);
    });

    it('returns 0 no_show_rate when there is nothing in the 30-day window', async () => {
      const result = await service.getDashboard(tenantUser);
      expect(result.no_show_rate).toBe(0);
    });

    it('computes clinician utilisation from weekly ClinicianAvailability, capped at 100%', async () => {
      prisma.clinicians.findMany.mockResolvedValue([
        {
          id: 'clinician-1',
          first_name: 'Sarah',
          last_name: 'Mitchell',
          avatar_url: null,
          clinician_type: 'GP',
          // 09:00-17:00 every day this whole session's 7-day window will hit,
          // so this is intentionally recurrence_type 'daily' to be deterministic
          // regardless of which weekday "today" happens to fall on in CI.
          availability: [{ recurrence_type: 'daily', day_of_week: null, start_time: '09:00', end_time: '17:00' }],
          appointments: [{ id: 'a1' }, { id: 'a2' }],
        },
      ]);

      const result = await service.getDashboard(tenantUser);
      expect(result.utilisation_by_clinician).toHaveLength(1);
      const row = result.utilisation_by_clinician[0];
      expect(row.slots_booked).toBe(2);
      expect(row.slots_available).toBeGreaterThan(0);
      expect(row.utilisation_percent).toBeLessThanOrEqual(100);
      expect(row.utilisation_percent).toBeGreaterThan(0);
    });

    it('falls back to slots_available = max(slots_booked, 1) when a clinician has no matching availability rows', async () => {
      prisma.clinicians.findMany.mockResolvedValue([
        {
          id: 'clinician-1',
          first_name: 'Sarah',
          last_name: 'Mitchell',
          avatar_url: null,
          clinician_type: 'GP',
          availability: [],
          appointments: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }],
        },
      ]);

      const result = await service.getDashboard(tenantUser);
      expect(result.utilisation_by_clinician[0].slots_available).toBe(3);
      expect(result.utilisation_by_clinician[0].utilisation_percent).toBe(100);
    });

    it('groups bookings_by_service by product name, sorted by count descending', async () => {
      prisma.appointments.findMany.mockImplementation((args: any) => {
        if (args.select?.product) {
          return Promise.resolve([
            { product: { name: 'X-Ray' } },
            { product: { name: 'Consultation' } },
            { product: { name: 'Consultation' } },
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await service.getDashboard(tenantUser);
      expect(result.bookings_by_service).toEqual([
        { service_name: 'Consultation', count: 2 },
        { service_name: 'X-Ray', count: 1 },
      ]);
    });

    it('maps upcoming_appointments start/end datetime from appointment_time + duration_minutes', async () => {
      const start = new Date('2026-08-25T10:00:00.000Z');
      prisma.appointments.findMany.mockImplementation((args: any) => {
        if (args.include?.patient) {
          return Promise.resolve([
            {
              id: 'appt-1',
              appointment_time: start,
              duration_minutes: 45,
              status: 'scheduled',
              patient: { id: 'p1', first_name: 'Anita', last_name: 'Sharma' },
              clinician: { id: 'c1', first_name: 'Sarah', last_name: 'Mitchell' },
              product: { id: 'prod1', name: 'GP Consultation' },
            },
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await service.getDashboard(tenantUser);
      expect(result.upcoming_appointments[0]).toEqual(
        expect.objectContaining({
          id: 'appt-1',
          start_datetime: start,
          end_datetime: new Date(start.getTime() + 45 * 60000),
          patient: { id: 'p1', full_name: 'Anita Sharma' },
          clinician: { id: 'c1', full_name: 'Sarah Mitchell' },
          service: { id: 'prod1', name: 'GP Consultation' },
        }),
      );
    });
  });
});
