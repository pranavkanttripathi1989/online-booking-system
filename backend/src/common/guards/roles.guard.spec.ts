import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const contextWithUser = (user: unknown): ExecutionContext => {
    const gqlCtx = { getContext: () => ({ req: { user } }) };
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue(gqlCtx as any);
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  afterEach(() => jest.restoreAllMocks());

  it('allows the request through when the resolver declares no @Roles() at all', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(contextWithUser(undefined))).toBe(true);
  });

  it('rejects when roles are required but no authenticated user is on the request (guard-ordering safety net)', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(
      new ForbiddenException('Not authenticated'),
    );
  });

  it('rejects a role not in the allow-list (TC-AUTH-API-007)', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin', 'super_admin']);
    const ctx = contextWithUser({ sub: 'u1', roles: ['staff'], client_org_id: 'org-a' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows a caller who holds at least one of the required roles — OR semantics, not AND (TC-AUTH-UNIT-006)', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin', 'manager']);
    const ctx = contextWithUser({ sub: 'u1', roles: ['manager'], client_org_id: 'org-a' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects a caller from one tenant attempting an action gated only by role, when they lack that role in their own tenant', () => {
    // RolesGuard itself is tenant-agnostic (role-only) — this test documents
    // that fact explicitly rather than assuming tenant isolation is this
    // guard's job. Tenant isolation is enforced per-resolver via
    // req.user.client_org_id filtering in the service layer (see
    // appointments.service.ts's orgScope()), not here.
    reflector.getAllAndOverride.mockReturnValue(['manager']);
    const ctx = contextWithUser({ sub: 'u2', roles: ['patient'], client_org_id: 'org-b' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
