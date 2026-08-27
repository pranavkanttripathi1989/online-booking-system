import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { RevenueShareResolver } from './revenue-share.resolver';
import { RevenueShareService } from './revenue-share.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

describe('RevenueShareResolver', () => {
  let resolver: RevenueShareResolver;
  let service: {
    revenueShareRules: jest.Mock;
    setRevenueShareRule: jest.Mock;
    payouts: jest.Mock;
    computeMonthlyPayouts: jest.Mock;
    approvePayout: jest.Mock;
  };
  const reflector = new Reflector();
  const user = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as any;

  beforeEach(async () => {
    service = {
      revenueShareRules: jest.fn(),
      setRevenueShareRule: jest.fn(),
      payouts: jest.fn(),
      computeMonthlyPayouts: jest.fn(),
      approvePayout: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [RevenueShareResolver, { provide: RevenueShareService, useValue: service }],
    }).compile();
    resolver = module.get(RevenueShareResolver);
  });

  // Manager, not admin/super_admin-only — deliberately, matching
  // departments/services/insurance's own precedent (CLAUDE.md's Phase
  // G+2 finding: an admin/super_admin-only gate makes a domain's own
  // isSameOrg() cross-org check unreachable dead code).
  describe('role gating (@Auth annotations)', () => {
    const cases: [string, (...args: unknown[]) => unknown][] = [
      ['revenueShareRules', RevenueShareResolver.prototype.revenueShareRules],
      ['setRevenueShareRule', RevenueShareResolver.prototype.setRevenueShareRule],
      ['payouts', RevenueShareResolver.prototype.payouts],
      ['computeMonthlyPayouts', RevenueShareResolver.prototype.computeMonthlyPayouts],
      ['approvePayout', RevenueShareResolver.prototype.approvePayout],
    ];

    it.each(cases)('%s includes manager, admin, and super_admin', (_name, handler) => {
      const roles = reflector.get(ROLES_KEY, handler);
      expect(roles).toEqual(['manager', 'admin', 'super_admin']);
    });
  });

  it('revenueShareRules delegates to the service', async () => {
    service.revenueShareRules.mockResolvedValue([{ id: 'r1' }]);
    const result = await resolver.revenueShareRules('clinic-a', user);
    expect(service.revenueShareRules).toHaveBeenCalledWith('clinic-a', user);
    expect(result).toEqual([{ id: 'r1' }]);
  });

  it('setRevenueShareRule delegates to the service', async () => {
    const input = { scope: 'org', share_percentage: 50 } as any;
    service.setRevenueShareRule.mockResolvedValue({ success: true, userErrors: [], rule: { id: 'r1' } });
    const result = await resolver.setRevenueShareRule(input, user);
    expect(service.setRevenueShareRule).toHaveBeenCalledWith(input, user);
    expect(result.success).toBe(true);
  });

  it('payouts delegates to the service with all filter args', async () => {
    service.payouts.mockResolvedValue([]);
    await resolver.payouts('clinic-a', 2026, 8, user);
    expect(service.payouts).toHaveBeenCalledWith('clinic-a', 2026, 8, user);
  });

  it('computeMonthlyPayouts delegates to the service', async () => {
    const input = { clinic_id: 'clinic-a', year: 2026, month: 8 } as any;
    service.computeMonthlyPayouts.mockResolvedValue({ success: true, userErrors: [], payouts: [], skippedClinicianNames: [] });
    const result = await resolver.computeMonthlyPayouts(input, user);
    expect(service.computeMonthlyPayouts).toHaveBeenCalledWith(input, user);
    expect(result.success).toBe(true);
  });

  it('approvePayout delegates to the service', async () => {
    service.approvePayout.mockResolvedValue({ id: 'po1', status: 'approved' });
    const result = await resolver.approvePayout('po1', user);
    expect(service.approvePayout).toHaveBeenCalledWith('po1', user);
    expect(result.status).toBe('approved');
  });
});
