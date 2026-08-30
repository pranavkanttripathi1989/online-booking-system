import { Test, TestingModule } from '@nestjs/testing';
import { MembershipsService } from './memberships.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('MembershipsService', () => {
  let service: MembershipsService;
  let prisma: any;

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a' } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u3', roles: ['admin'], client_org_id: null } as JwtPayload;
  const noOrgManager: JwtPayload = { sub: 'u4', roles: ['manager'], client_org_id: null } as JwtPayload;

  const clinicA = { id: 'clinic-a', client_org_id: 'org-a', is_deleted: false };
  const clinicB = { id: 'clinic-b', client_org_id: 'org-b', is_deleted: false };

  const planRow = {
    id: 'plan-a1',
    client_org_id: 'org-a',
    clinic_id: 'clinic-a',
    name: 'Wellness Basic',
    description: null,
    price_monthly_paise: 49900,
    is_active: true,
    is_deleted: false,
    clinic: clinicA,
  };

  const patientRow = { id: 'pat-1', client_org_id: 'org-a', is_deleted: false };

  beforeEach(async () => {
    prisma = {
      membershipPlans: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn() },
      patientMemberships: {
        create: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      clinics: { findUnique: jest.fn() },
      patients: { findUnique: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [MembershipsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(MembershipsService);
  });

  describe('listPlans', () => {
    it('with no clinic_id, scopes to the caller\'s own org only', async () => {
      prisma.membershipPlans.findMany.mockResolvedValue([planRow]);
      const result = await service.listPlans(undefined, orgAUser);
      expect(result).toHaveLength(1);
      expect(prisma.membershipPlans.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinic: { client_org_id: 'org-a' } }) }),
      );
    });

    it('returns [] for a cross-org clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      expect(await service.listPlans('clinic-b', orgAUser)).toEqual([]);
      expect(prisma.membershipPlans.findMany).not.toHaveBeenCalled();
    });

    it('lists plans for an in-scope clinic, converting paise to rupees', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.membershipPlans.findMany.mockResolvedValue([planRow]);
      const result = await service.listPlans('clinic-a', orgAUser);
      expect(result[0].price_monthly).toBe(499);
    });
  });

  describe('createPlan', () => {
    it('rejects a cross-org clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      const result = await service.createPlan({ clinic_id: 'clinic-b', name: 'x', price_monthly: 100 }, orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.membershipPlans.create).not.toHaveBeenCalled();
    });

    it('rejects a clinic with no organization to anchor to', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ ...clinicA, client_org_id: null });
      const result = await service.createPlan({ clinic_id: 'clinic-a', name: 'x', price_monthly: 100 }, orgAUser);
      expect(result.success).toBe(false);
    });

    it('creates a real plan, converting rupees to paise', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.membershipPlans.create.mockResolvedValue(planRow);
      const result = await service.createPlan({ clinic_id: 'clinic-a', name: 'Wellness Basic', price_monthly: 499 }, orgAUser);
      expect(result.success).toBe(true);
      expect(prisma.membershipPlans.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ price_monthly_paise: 49900 }) }),
      );
    });
  });

  describe('updatePlan / removePlan', () => {
    it('rejects a cross-org plan on update', async () => {
      prisma.membershipPlans.findUnique.mockResolvedValue({ ...planRow, clinic: clinicB, client_org_id: 'org-b' });
      const result = await service.updatePlan('plan-b1', { name: 'x' }, orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.membershipPlans.update).not.toHaveBeenCalled();
    });

    it('rejects a cross-org plan on delete', async () => {
      prisma.membershipPlans.findUnique.mockResolvedValue({ ...planRow, clinic: clinicB, client_org_id: 'org-b' });
      const result = await service.removePlan('plan-b1', orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.membershipPlans.update).not.toHaveBeenCalled();
    });

    it('soft-deletes an owned plan', async () => {
      prisma.membershipPlans.findUnique.mockResolvedValue(planRow);
      prisma.membershipPlans.update.mockResolvedValue({ ...planRow, is_deleted: true });
      const result = await service.removePlan('plan-a1', orgAUser);
      expect(result.success).toBe(true);
      expect(prisma.membershipPlans.update).toHaveBeenCalledWith({ where: { id: 'plan-a1' }, data: { is_deleted: true } });
    });
  });

  describe('patientMembership', () => {
    it('scopes to the caller\'s own org, never a bare {} for an org-less caller', async () => {
      prisma.patientMemberships.findFirst.mockResolvedValue(null);
      await service.patientMembership('pat-1', noOrgManager);
      expect(prisma.patientMemberships.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: '__no_org__' }) }),
      );
    });

    it('a platform operator is not org-filtered', async () => {
      prisma.patientMemberships.findFirst.mockResolvedValue(null);
      await service.patientMembership('pat-1', platformUser);
      const call = prisma.patientMemberships.findFirst.mock.calls[0][0];
      expect(call.where.client_org_id).toBeUndefined();
    });

    it('returns null when no active membership exists', async () => {
      prisma.patientMemberships.findFirst.mockResolvedValue(null);
      expect(await service.patientMembership('pat-1', orgAUser)).toBeNull();
    });

    it('converts paise to rupees on a real active membership', async () => {
      prisma.patientMemberships.findFirst.mockResolvedValue({
        id: 'pm-1',
        membership_plan_id: 'plan-a1',
        patient_id: 'pat-1',
        price_monthly_paise: 49900,
        status: 'active',
        enrolled_at: new Date(),
        cancelled_at: null,
        membershipPlan: planRow,
      });
      const result = await service.patientMembership('pat-1', orgAUser);
      expect(result?.price_monthly).toBe(499);
      expect(result?.membershipPlan?.price_monthly).toBe(499);
    });
  });

  describe('enroll', () => {
    it('rejects a cross-org plan', async () => {
      prisma.membershipPlans.findUnique.mockResolvedValue({ ...planRow, clinic: clinicB, client_org_id: 'org-b' });
      const result = await service.enroll({ patient_id: 'pat-1', membership_plan_id: 'plan-b1' }, orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.patientMemberships.create).not.toHaveBeenCalled();
    });

    it('rejects an inactive plan', async () => {
      prisma.membershipPlans.findUnique.mockResolvedValue({ ...planRow, is_active: false });
      const result = await service.enroll({ patient_id: 'pat-1', membership_plan_id: 'plan-a1' }, orgAUser);
      expect(result.success).toBe(false);
    });

    it('rejects a cross-org patient', async () => {
      prisma.membershipPlans.findUnique.mockResolvedValue(planRow);
      prisma.patients.findUnique.mockResolvedValue({ ...patientRow, client_org_id: 'org-b' });
      const result = await service.enroll({ patient_id: 'pat-1', membership_plan_id: 'plan-a1' }, orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.patientMemberships.create).not.toHaveBeenCalled();
    });

    it('cancels any existing active membership before creating the new one, denormalizing price at enroll time', async () => {
      prisma.membershipPlans.findUnique.mockResolvedValue(planRow);
      prisma.patients.findUnique.mockResolvedValue(patientRow);
      prisma.patientMemberships.create.mockResolvedValue({
        id: 'pm-2',
        membership_plan_id: 'plan-a1',
        patient_id: 'pat-1',
        price_monthly_paise: 49900,
        status: 'active',
        enrolled_at: new Date(),
        cancelled_at: null,
        membershipPlan: planRow,
      });

      const result = await service.enroll({ patient_id: 'pat-1', membership_plan_id: 'plan-a1' }, orgAUser);

      expect(result.success).toBe(true);
      expect(prisma.patientMemberships.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patient_id: 'pat-1', status: 'active', is_deleted: false },
          data: expect.objectContaining({ status: 'cancelled' }),
        }),
      );
      expect(prisma.patientMemberships.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ price_monthly_paise: 49900, patient_id: 'pat-1' }) }),
      );
      expect(result.patientMembership?.price_monthly).toBe(499);
    });
  });

  describe('cancel', () => {
    it('returns a real error when no active membership exists', async () => {
      prisma.patientMemberships.findFirst.mockResolvedValue(null);
      const result = await service.cancel({ patient_id: 'pat-1' }, orgAUser);
      expect(result.success).toBe(false);
    });

    it('rejects a cross-org active membership', async () => {
      prisma.patientMemberships.findFirst.mockResolvedValue({ id: 'pm-1', patient_id: 'pat-1', client_org_id: 'org-b', status: 'active' });
      const result = await service.cancel({ patient_id: 'pat-1' }, orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.patientMemberships.update).not.toHaveBeenCalled();
    });

    it('cancels a real active membership', async () => {
      prisma.patientMemberships.findFirst.mockResolvedValue({ id: 'pm-1', patient_id: 'pat-1', client_org_id: 'org-a', status: 'active' });
      prisma.patientMemberships.update.mockResolvedValue({
        id: 'pm-1',
        membership_plan_id: 'plan-a1',
        patient_id: 'pat-1',
        price_monthly_paise: 49900,
        status: 'cancelled',
        enrolled_at: new Date(),
        cancelled_at: new Date(),
        membershipPlan: planRow,
      });
      const result = await service.cancel({ patient_id: 'pat-1' }, orgAUser);
      expect(result.success).toBe(true);
      expect(prisma.patientMemberships.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pm-1' }, data: expect.objectContaining({ status: 'cancelled' }) }),
      );
    });
  });
});
