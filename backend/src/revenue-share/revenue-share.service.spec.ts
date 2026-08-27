import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RevenueShareService, resolveRevenueShare } from './revenue-share.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ158 (P2-06). resolveRevenueShare mirrors resolveServicePrice()'s own
// most-specific-wins cascade (resolve-price.ts, REQ055/REQ100).
describe('resolveRevenueShare', () => {
  it('prefers a clinician-level rule over clinic and org rules', () => {
    const rules = [
      { scope: 'org', clinic_id: null, clinician_id: null, share_percentage: 50 },
      { scope: 'clinic', clinic_id: 'clinic-a', clinician_id: null, share_percentage: 55 },
      { scope: 'clinician', clinic_id: 'clinic-a', clinician_id: 'clin-1', share_percentage: 65 },
    ];
    expect(resolveRevenueShare(rules, 'clin-1', 'clinic-a')).toBe(65);
  });

  it('falls through to the clinic rule when no clinician rule matches', () => {
    const rules = [
      { scope: 'org', clinic_id: null, clinician_id: null, share_percentage: 50 },
      { scope: 'clinic', clinic_id: 'clinic-a', clinician_id: null, share_percentage: 55 },
    ];
    expect(resolveRevenueShare(rules, 'clin-2', 'clinic-a')).toBe(55);
  });

  it('falls through to the org default when nothing more specific matches', () => {
    const rules = [{ scope: 'org', clinic_id: null, clinician_id: null, share_percentage: 50 }];
    expect(resolveRevenueShare(rules, 'clin-2', 'clinic-b')).toBe(50);
  });

  it('returns null when no rule exists at any level', () => {
    expect(resolveRevenueShare([], 'clin-2', 'clinic-b')).toBeNull();
  });

  it('never lets a clinic rule for a different clinic leak through', () => {
    const rules = [{ scope: 'clinic', clinic_id: 'clinic-a', clinician_id: null, share_percentage: 55 }];
    expect(resolveRevenueShare(rules, 'clin-2', 'clinic-b')).toBeNull();
  });
});

describe('RevenueShareService', () => {
  let service: RevenueShareService;
  let prisma: {
    clinics: { findUnique: jest.Mock };
    clinicians: { findUnique: jest.Mock; findMany: jest.Mock };
    revenueShareRules: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
    appointmentPayments: { findMany: jest.Mock };
    payouts: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u3', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const clinicA = { id: 'clinic-a', client_org_id: 'org-a', is_deleted: false };
  const clinicB = { id: 'clinic-b', client_org_id: 'org-b', is_deleted: false };
  const clinicianA1 = { id: 'clin-a1', clinic_id: 'clinic-a', is_deleted: false, clinic: clinicA, first_name: 'Asha', last_name: 'Rao' };

  beforeEach(async () => {
    prisma = {
      clinics: { findUnique: jest.fn() },
      clinicians: { findUnique: jest.fn(), findMany: jest.fn() },
      revenueShareRules: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      appointmentPayments: { findMany: jest.fn() },
      payouts: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [RevenueShareService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(RevenueShareService);
  });

  describe('setRevenueShareRule — Hard Rule 6', () => {
    it('rejects a clinic_id belonging to a different org', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      await expect(
        service.setRevenueShareRule({ scope: 'clinic', clinic_id: 'clinic-b', share_percentage: 60 }, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a clinician_id belonging to a different org', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.clinicians.findUnique.mockResolvedValue({ ...clinicianA1, clinic: clinicB, id: 'clin-x' });
      await expect(
        service.setRevenueShareRule({ scope: 'clinician', clinic_id: 'clinic-a', clinician_id: 'clin-x', share_percentage: 60 }, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires clinic_id for a clinic-scope rule', async () => {
      await expect(service.setRevenueShareRule({ scope: 'clinic', share_percentage: 60 }, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('creates a new org-level rule when none exists', async () => {
      prisma.revenueShareRules.findFirst.mockResolvedValue(null);
      prisma.revenueShareRules.create.mockResolvedValue({ id: 'r1', scope: 'org', clinic_id: null, clinician_id: null, share_percentage: 50, clinic: null, clinician: null });
      const result = await service.setRevenueShareRule({ scope: 'org', share_percentage: 50 }, orgAUser);
      expect(prisma.revenueShareRules.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-a', scope: 'org', share_percentage: 50 }) }),
      );
      expect(result.success).toBe(true);
    });

    it('updates the existing rule in place instead of creating a duplicate', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      const existing = { id: 'r2', scope: 'clinic', clinic_id: 'clinic-a', clinician_id: null };
      prisma.revenueShareRules.findFirst.mockResolvedValue(existing);
      prisma.revenueShareRules.update.mockResolvedValue({ ...existing, share_percentage: 70, clinic: clinicA, clinician: null });
      await service.setRevenueShareRule({ scope: 'clinic', clinic_id: 'clinic-a', share_percentage: 70 }, orgAUser);
      expect(prisma.revenueShareRules.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'r2' }, data: { share_percentage: 70 } }),
      );
      expect(prisma.revenueShareRules.create).not.toHaveBeenCalled();
    });

    it('rejects an org-less non-platform caller with no org to write to', async () => {
      const orgLessPatient = { sub: 'u9', roles: ['patient'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;
      // orgIdForWrite's own fail-closed guard — ForbiddenException, not
      // BadRequestException (this codebase's established convention for
      // "no org to write to").
      await expect(service.setRevenueShareRule({ scope: 'org', share_percentage: 50 }, orgLessPatient)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('computeMonthlyPayouts', () => {
    const paymentsForClinician = (clinicianId: string, amountPaise: number, discount = 0) => ({
      id: `pay-${clinicianId}`,
      amount: amountPaise,
      discount_amount: discount,
      appointment: { clinician_id: clinicianId },
    });

    beforeEach(() => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
    });

    it('sums succeeded payments per clinician and applies the resolved share', async () => {
      prisma.appointmentPayments.findMany.mockResolvedValue([
        paymentsForClinician('clin-a1', 300000),
        paymentsForClinician('clin-a1', 200000),
      ]);
      prisma.revenueShareRules.findMany.mockResolvedValue([{ scope: 'clinic', clinic_id: 'clinic-a', clinician_id: null, share_percentage: 60 }]);
      prisma.clinicians.findMany.mockResolvedValue([clinicianA1]);
      prisma.payouts.findUnique.mockResolvedValue(null);
      prisma.payouts.create.mockResolvedValue({
        id: 'po1', clinic_id: 'clinic-a', clinician_id: 'clin-a1', clinician: clinicianA1,
        period_start: new Date('2026-08-01'), period_end: new Date('2026-09-01'),
        gross_amount: 500000, share_percentage_used: 60, payout_amount: 300000,
        appointment_count: 2, status: 'pending_approval', approved_at: null,
      });

      const result = await service.computeMonthlyPayouts({ clinic_id: 'clinic-a', year: 2026, month: 8 }, orgAUser);

      expect(prisma.payouts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ gross_amount: 500000, share_percentage_used: 60, payout_amount: 300000, appointment_count: 2 }),
        }),
      );
      expect(result.skippedClinicianNames).toEqual([]);
      expect(result.payouts).toHaveLength(1);
      expect(result.payouts[0].payout_amount).toBe(3000); // rupees, converted at the boundary
    });

    it('skips a clinician with no resolvable share rule and reports their name', async () => {
      prisma.appointmentPayments.findMany.mockResolvedValue([paymentsForClinician('clin-a1', 100000)]);
      prisma.revenueShareRules.findMany.mockResolvedValue([]);
      prisma.clinicians.findMany.mockResolvedValue([clinicianA1]);

      const result = await service.computeMonthlyPayouts({ clinic_id: 'clinic-a', year: 2026, month: 8 }, orgAUser);

      expect(result.skippedClinicianNames).toEqual(['Asha Rao']);
      expect(result.payouts).toEqual([]);
      expect(prisma.payouts.create).not.toHaveBeenCalled();
    });

    it('US-REV-03: never overwrites an already-approved payout', async () => {
      prisma.appointmentPayments.findMany.mockResolvedValue([paymentsForClinician('clin-a1', 999999)]);
      prisma.revenueShareRules.findMany.mockResolvedValue([{ scope: 'org', clinic_id: null, clinician_id: null, share_percentage: 99 }]);
      prisma.clinicians.findMany.mockResolvedValue([clinicianA1]);
      const approvedRow = {
        id: 'po-approved', clinic_id: 'clinic-a', clinician_id: 'clin-a1', clinician: clinicianA1,
        period_start: new Date('2026-08-01'), period_end: new Date('2026-09-01'),
        gross_amount: 300000, share_percentage_used: 60, payout_amount: 180000,
        appointment_count: 1, status: 'approved', approved_at: new Date('2026-09-01'),
      };
      prisma.payouts.findUnique.mockResolvedValue(approvedRow);

      const result = await service.computeMonthlyPayouts({ clinic_id: 'clinic-a', year: 2026, month: 8 }, orgAUser);

      expect(prisma.payouts.update).not.toHaveBeenCalled();
      expect(prisma.payouts.create).not.toHaveBeenCalled();
      // the untouched, already-approved figure is still returned in the run summary
      expect(result.payouts[0].payout_amount).toBe(1800);
      expect(result.payouts[0].status).toBe('approved');
    });

    it('rejects a clinic_id belonging to a different org', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      await expect(service.computeMonthlyPayouts({ clinic_id: 'clinic-b', year: 2026, month: 8 }, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('returns immediately with no queries when there are no succeeded payments', async () => {
      prisma.appointmentPayments.findMany.mockResolvedValue([]);
      const result = await service.computeMonthlyPayouts({ clinic_id: 'clinic-a', year: 2026, month: 8 }, orgAUser);
      expect(result.payouts).toEqual([]);
      expect(prisma.revenueShareRules.findMany).not.toHaveBeenCalled();
    });
  });

  describe('approvePayout', () => {
    it('rejects a payout belonging to a different org — masked as not-found, per assertSameOrg convention', async () => {
      prisma.payouts.findUnique.mockResolvedValue({ id: 'po1', client_org_id: 'org-b', status: 'pending_approval' });
      await expect(service.approvePayout('po1', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for a nonexistent payout', async () => {
      prisma.payouts.findUnique.mockResolvedValue(null);
      await expect(service.approvePayout('missing', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('a platform operator may approve across orgs', async () => {
      prisma.payouts.findUnique.mockResolvedValueOnce({ id: 'po1', client_org_id: 'org-a', status: 'pending_approval' });
      prisma.payouts.update.mockResolvedValue({
        id: 'po1', clinic_id: 'clinic-a', clinician_id: 'clin-a1', clinician: clinicianA1,
        period_start: new Date(), period_end: new Date(), gross_amount: 100000, share_percentage_used: 50,
        payout_amount: 50000, appointment_count: 1, status: 'approved', approved_at: new Date(),
      });
      const result = await service.approvePayout('po1', platformUser);
      expect(prisma.payouts.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'approved', approved_by_user_id: 'u3' }) }),
      );
      expect(result.status).toBe('approved');
    });

    it('is idempotent — approving an already-approved payout does not re-stamp it', async () => {
      prisma.payouts.findUnique
        .mockResolvedValueOnce({ id: 'po1', client_org_id: 'org-a', status: 'approved' })
        .mockResolvedValueOnce({
          id: 'po1', clinic_id: 'clinic-a', clinician_id: 'clin-a1', clinician: clinicianA1,
          period_start: new Date(), period_end: new Date(), gross_amount: 100000, share_percentage_used: 50,
          payout_amount: 50000, appointment_count: 1, status: 'approved', approved_at: new Date('2026-08-01'),
        });
      await service.approvePayout('po1', orgAUser);
      expect(prisma.payouts.update).not.toHaveBeenCalled();
    });
  });
});
