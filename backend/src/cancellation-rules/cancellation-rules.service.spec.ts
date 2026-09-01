import { Test, TestingModule } from '@nestjs/testing';
import { CancellationRulesService } from './cancellation-rules.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('CancellationRulesService', () => {
  let service: CancellationRulesService;
  let prisma: {
    productCancellationRules: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    clinics: { findUnique: jest.Mock };
    products: { findUnique: jest.Mock };
  };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u3', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const clinicA = { id: 'clinic-a', client_org_id: 'org-a', is_deleted: false };
  const clinicB = { id: 'clinic-b', client_org_id: 'org-b', is_deleted: false };

  const ruleA = {
    id: 'rule-a1',
    name: 'Standard',
    description: null,
    product_id: null,
    clinic_id: 'clinic-a',
    client_org_id: 'org-a',
    hours_before_appointment: 24,
    fee_type: 'percentage',
    fee_amount: 50,
    priority: 1,
    is_active: true,
    is_deleted: false,
    clinic: clinicA,
  };
  const globalRuleA = { ...ruleA, id: 'rule-a-global', clinic_id: null, clinic: null };
  const ruleB = { ...ruleA, id: 'rule-b1', clinic_id: 'clinic-b', client_org_id: 'org-b', clinic: clinicB };

  beforeEach(async () => {
    prisma = {
      productCancellationRules: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      clinics: { findUnique: jest.fn() },
      products: { findUnique: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [CancellationRulesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(CancellationRulesService);
  });

  describe('list — tenant isolation', () => {
    it('scopes to the caller org via the direct client_org_id column', async () => {
      prisma.productCancellationRules.findMany.mockResolvedValue([]);
      await service.list(orgAUser);
      expect(prisma.productCancellationRules.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
    });

    it('does not scope by org for a platform-wide caller', async () => {
      prisma.productCancellationRules.findMany.mockResolvedValue([]);
      await service.list(platformUser);
      const callArg = prisma.productCancellationRules.findMany.mock.calls[0][0];
      expect(callArg.where.client_org_id).toBeUndefined();
    });

    it('maps hours_before_appointment to hours_before on output', async () => {
      prisma.productCancellationRules.findMany.mockResolvedValue([ruleA]);
      const [result] = await service.list(orgAUser);
      expect(result.hours_before).toBe(24);
      expect(result.clinic).toEqual({ id: 'clinic-a', name: undefined });
    });
  });

  describe('create', () => {
    const baseInput = { name: 'Late Cancel', hours_before: 12, fee_type: 'fixed', fee_amount: 500 };

    it('rejects a clinic outside the caller org (cross-tenant create)', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      const result = await service.create({ ...baseInput, clinic_id: 'clinic-b' } as any, orgAUser);
      expect(result.success).toBe(false);
      expect(result.userErrors[0].message).toMatch(/not found/i);
      expect(prisma.productCancellationRules.create).not.toHaveBeenCalled();
    });

    it('rejects a nonexistent clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue(null);
      const result = await service.create({ ...baseInput, clinic_id: 'nope' } as any, orgAUser);
      expect(result.success).toBe(false);
    });

    it('creates a clinic-scoped rule and stamps client_org_id from the clinic, not the caller', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.productCancellationRules.create.mockResolvedValue(ruleA);
      const result = await service.create({ ...baseInput, clinic_id: 'clinic-a' } as any, platformUser);
      expect(result.success).toBe(true);
      expect(prisma.productCancellationRules.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ clinic_id: 'clinic-a', client_org_id: 'org-a' }) }),
      );
    });

    it('creates a global rule anchored to the caller org (manager)', async () => {
      prisma.productCancellationRules.create.mockResolvedValue(globalRuleA);
      const result = await service.create({ ...baseInput } as any, orgAUser);
      expect(result.success).toBe(true);
      expect(prisma.productCancellationRules.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ clinic_id: null, client_org_id: 'org-a' }) }),
      );
    });

    it('creates a truly platform-wide global rule for a platform caller (client_org_id null)', async () => {
      prisma.productCancellationRules.create.mockResolvedValue({ ...globalRuleA, client_org_id: null });
      const result = await service.create({ ...baseInput } as any, platformUser);
      expect(result.success).toBe(true);
      expect(prisma.productCancellationRules.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ clinic_id: null, client_org_id: null }) }),
      );
    });

    it('returns {success:false} instead of throwing on a DB error', async () => {
      prisma.productCancellationRules.create.mockRejectedValue(new Error('db exploded'));
      const result = await service.create({ ...baseInput } as any, orgAUser);
      expect(result.success).toBe(false);
      expect(result.userErrors[0].message).toBe('db exploded');
    });

    // REQ177 -- product_id (per-service fee) was previously schema-only.
    it('rejects a service (product) outside the caller org (cross-tenant create)', async () => {
      prisma.products.findUnique.mockResolvedValue({ id: 'prod-b', client_org_id: 'org-b', is_deleted: false });
      const result = await service.create({ ...baseInput, product_id: 'prod-b' } as any, orgAUser);
      expect(result.success).toBe(false);
      expect(result.userErrors[0].message).toBe('Service not found');
      expect(prisma.productCancellationRules.create).not.toHaveBeenCalled();
    });

    it('creates a service-scoped rule and stamps client_org_id from the service when no clinic is given', async () => {
      prisma.products.findUnique.mockResolvedValue({ id: 'prod-a', client_org_id: 'org-a', is_deleted: false });
      prisma.productCancellationRules.create.mockResolvedValue({ ...ruleA, product_id: 'prod-a', clinic_id: null });
      const result = await service.create({ ...baseInput, clinic_id: undefined, product_id: 'prod-a' } as any, orgAUser);
      expect(result.success).toBe(true);
      expect(prisma.productCancellationRules.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ product_id: 'prod-a', client_org_id: 'org-a' }) }),
      );
    });

    it('defaults rule_type to cancellation when not supplied (existing callers unaffected)', async () => {
      prisma.productCancellationRules.create.mockResolvedValue(ruleA);
      await service.create({ ...baseInput } as any, orgAUser);
      expect(prisma.productCancellationRules.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ rule_type: 'cancellation' }) }),
      );
    });

    it('creates a reschedule-type rule when explicitly requested', async () => {
      prisma.productCancellationRules.create.mockResolvedValue({ ...ruleA, rule_type: 'reschedule' });
      await service.create({ ...baseInput, rule_type: 'reschedule' } as any, orgAUser);
      expect(prisma.productCancellationRules.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ rule_type: 'reschedule' }) }),
      );
    });
  });

  describe('findActiveRulesForOrg (REQ176/REQ177 — internal, used by the refund/reschedule-fee engine)', () => {
    it('queries by client_org_id and rule_type, and maps rows to the pure-function shape', async () => {
      prisma.productCancellationRules.findMany.mockResolvedValue([
        { hours_before_appointment: 24, fee_type: 'fixed', fee_amount: 20000, product_id: 'prod-a', clinic_id: 'clinic-a', priority: 1 },
      ]);
      const rules = await service.findActiveRulesForOrg('org-a', 'reschedule');
      expect(prisma.productCancellationRules.findMany).toHaveBeenCalledWith({
        where: { is_deleted: false, is_active: true, rule_type: 'reschedule', client_org_id: 'org-a' },
      });
      expect(rules).toEqual([{ hours_before_appointment: 24, fee_type: 'fixed', fee_amount: 20000, product_id: 'prod-a', clinic_id: 'clinic-a', priority: 1 }]);
    });
  });

  describe('update — tenant isolation', () => {
    it('rejects updating a rule owned by another org', async () => {
      prisma.productCancellationRules.findUnique.mockResolvedValue(ruleB);
      const result = await service.update('rule-b1', { name: 'Hacked' } as any, orgAUser);
      expect(result.success).toBe(false);
      expect(result.userErrors[0].message).toMatch(/not found/i);
      expect(prisma.productCancellationRules.update).not.toHaveBeenCalled();
    });

    it('rejects reassigning to a clinic outside the caller org', async () => {
      prisma.productCancellationRules.findUnique.mockResolvedValue(ruleA);
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      const result = await service.update('rule-a1', { clinic_id: 'clinic-b' } as any, orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.productCancellationRules.update).not.toHaveBeenCalled();
    });

    it('updates fields for an owned rule and leaves client_org_id untouched when clinic_id is omitted', async () => {
      prisma.productCancellationRules.findUnique.mockResolvedValue(ruleA);
      prisma.productCancellationRules.update.mockResolvedValue({ ...ruleA, name: 'Renamed' });
      const result = await service.update('rule-a1', { name: 'Renamed' } as any, orgAUser);
      expect(result.success).toBe(true);
      expect(prisma.productCancellationRules.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: undefined, clinic_id: undefined }) }),
      );
    });

    it('clears clinic_id when switching to global but preserves the existing client_org_id anchor', async () => {
      prisma.productCancellationRules.findUnique.mockResolvedValue(ruleA);
      prisma.productCancellationRules.update.mockResolvedValue({ ...ruleA, clinic_id: null });
      const result = await service.update('rule-a1', { clinic_id: '' } as any, orgAUser);
      expect(result.success).toBe(true);
      expect(prisma.productCancellationRules.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ clinic_id: null, client_org_id: undefined }) }),
      );
    });
  });

  describe('remove — tenant isolation', () => {
    it('rejects deleting a rule owned by another org', async () => {
      prisma.productCancellationRules.findUnique.mockResolvedValue(ruleB);
      const result = await service.remove('rule-b1', orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.productCancellationRules.update).not.toHaveBeenCalled();
    });

    it('soft-deletes an owned rule', async () => {
      prisma.productCancellationRules.findUnique.mockResolvedValue(ruleA);
      prisma.productCancellationRules.update.mockResolvedValue({ ...ruleA, is_deleted: true });
      const result = await service.remove('rule-a1', orgAUser);
      expect(result.success).toBe(true);
      expect(prisma.productCancellationRules.update).toHaveBeenCalledWith({
        where: { id: 'rule-a1' },
        data: { is_deleted: true },
      });
    });
  });
});
