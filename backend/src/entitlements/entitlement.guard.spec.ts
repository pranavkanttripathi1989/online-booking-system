import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { EntitlementGuard } from './entitlement.guard';
import { EntitlementsService } from './entitlements.service';

// P1-04 — this guard is never registered in app.module.ts's global
// APP_GUARD array; it only runs where a resolver explicitly opts in via
// @UseGuards(EntitlementGuard) + @RequiresFeature(...). Matches
// ip-whitelist.guard.spec.ts's own established GqlExecutionContext mocking
// pattern exactly.
describe('EntitlementGuard', () => {
  let guard: EntitlementGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let entitlementsService: { hasFeature: jest.Mock };

  const makeContext = (featureKey: string | undefined, user: unknown): ExecutionContext => {
    reflector.getAllAndOverride.mockReturnValue(featureKey);
    const gqlCtx = { getContext: () => ({ req: { user } }) };
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue(gqlCtx as any);
    return { getHandler: () => ({}), getClass: () => ({}) } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() };
    entitlementsService = { hasFeature: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntitlementGuard,
        { provide: Reflector, useValue: reflector },
        { provide: EntitlementsService, useValue: entitlementsService },
      ],
    }).compile();
    guard = module.get(EntitlementGuard);
  });

  afterEach(() => jest.restoreAllMocks());

  it('allows the request through with no @RequiresFeature() metadata at all', async () => {
    const context = makeContext(undefined, null);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(entitlementsService.hasFeature).not.toHaveBeenCalled();
  });

  it('allows a platform operator (admin/super_admin) through unconditionally — no single org an entitlement could apply to', async () => {
    const context = makeContext('pharmacy', { roles: ['admin'], client_org_id: null });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(entitlementsService.hasFeature).not.toHaveBeenCalled();
  });

  it('allows the request when the org has this feature', async () => {
    entitlementsService.hasFeature.mockResolvedValue(true);
    const context = makeContext('pharmacy', { roles: ['manager'], client_org_id: 'org-a' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(entitlementsService.hasFeature).toHaveBeenCalledWith('org-a', 'pharmacy');
  });

  it('rejects with a clear ForbiddenException naming the feature when the org\'s plan does not include it', async () => {
    entitlementsService.hasFeature.mockResolvedValue(false);
    const context = makeContext('pharmacy', { roles: ['manager'], client_org_id: 'org-a' });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow(/pharmacy/);
  });

  it('allows a request with no req.user through without calling hasFeature — GqlAuthGuard (which runs before this in the chain) already rejects an unauthenticated caller; this is defensive, not a real path', async () => {
    const context = makeContext('pharmacy', undefined);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(entitlementsService.hasFeature).not.toHaveBeenCalled();
  });
});
