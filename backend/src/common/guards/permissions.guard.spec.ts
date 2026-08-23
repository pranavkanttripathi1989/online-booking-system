import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
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
    guard = new PermissionsGuard(reflector as unknown as Reflector);
  });

  afterEach(() => jest.restoreAllMocks());

  it('allows the request through when the resolver declares no @RequirePermission() at all', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(contextWithUser(undefined))).toBe(true);
  });

  it('rejects when a permission is required but no authenticated user is on the request (guard-ordering safety net)', () => {
    reflector.getAllAndOverride.mockReturnValue(['roles.delete']);
    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(
      new ForbiddenException('Not authenticated'),
    );
  });

  // The headline finding this guard closes (project-plans/02-findings-register.md):
  // a caller whose JWT carries no matching permission is rejected here, not
  // waved through because nothing ever checked the Permissions/RolePermissions
  // tables before.
  it('rejects a caller lacking the required permission, even with an admin-eligible role', () => {
    reflector.getAllAndOverride.mockReturnValue(['roles.delete']);
    const ctx = contextWithUser({ sub: 'u1', roles: ['admin'], client_org_id: null, permissions: ['roles.view'] });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('rejects a caller whose JWT has no permissions field at all (pre-REQ049 token, or a role with zero grants)', () => {
    reflector.getAllAndOverride.mockReturnValue(['roles.delete']);
    const ctx = contextWithUser({ sub: 'u1', roles: ['staff'], client_org_id: 'org-a' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows a caller who holds at least one of the required permissions — OR semantics, not AND', () => {
    reflector.getAllAndOverride.mockReturnValue(['roles.delete', 'roles.edit']);
    const ctx = contextWithUser({ sub: 'u1', roles: ['admin'], client_org_id: null, permissions: ['roles.edit'] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows a caller whose permissions include the exact single required permission', () => {
    reflector.getAllAndOverride.mockReturnValue(['roles.delete']);
    const ctx = contextWithUser({ sub: 'u1', roles: ['admin'], client_org_id: null, permissions: ['roles.delete'] });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
