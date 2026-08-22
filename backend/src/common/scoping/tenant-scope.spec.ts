import { NotFoundException } from '@nestjs/common';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { isPlatformOperator, orgScope, orgScopeVia, isSameOrg, assertSameOrg } from './tenant-scope';

const admin: JwtPayload = { sub: 'u1', roles: ['admin'], client_org_id: null };
const superAdmin: JwtPayload = { sub: 'u2', roles: ['super_admin'], client_org_id: null };
const manager: JwtPayload = { sub: 'u3', roles: ['manager'], client_org_id: 'org-A' };
// The exact shape a self-registered patient's JWT carries — this is the
// account type that made the org-less-sees-everything bug exploitable.
const selfRegisteredPatient: JwtPayload = { sub: 'u4', roles: ['patient'], client_org_id: null };
const orphanStaff: JwtPayload = { sub: 'u5', roles: ['staff'], client_org_id: null };

describe('isPlatformOperator', () => {
  it('is true for admin and super_admin regardless of org', () => {
    expect(isPlatformOperator(admin)).toBe(true);
    expect(isPlatformOperator(superAdmin)).toBe(true);
  });

  it('is false for every other role, org-less or not', () => {
    expect(isPlatformOperator(manager)).toBe(false);
    expect(isPlatformOperator(selfRegisteredPatient)).toBe(false);
    expect(isPlatformOperator(orphanStaff)).toBe(false);
  });

  it('does not throw on a payload with no roles array', () => {
    expect(isPlatformOperator({ sub: 'x', client_org_id: null } as JwtPayload)).toBe(false);
    expect(isPlatformOperator(null)).toBe(false);
    expect(isPlatformOperator(undefined)).toBe(false);
  });
});

describe('orgScope', () => {
  it('returns an unscoped filter for a platform operator', () => {
    expect(orgScope(admin)).toEqual({});
    expect(orgScope(superAdmin)).toEqual({});
  });

  it('scopes a real-org caller to their own org', () => {
    expect(orgScope(manager)).toEqual({ client_org_id: 'org-A' });
  });

  // The regression test for the actual live-exploited bug: this must never
  // be `{}`, or a self-registered account reads every tenant again.
  it('gives a non-operator with no org an impossible sentinel filter, never {}', () => {
    const scope = orgScope(selfRegisteredPatient);
    expect(scope).not.toEqual({});
    expect(scope.client_org_id).toBeTruthy();
    expect(scope.client_org_id).not.toBe('org-A');
  });

  it('supports a custom column name', () => {
    expect(orgScope(manager, 'org_id')).toEqual({ org_id: 'org-A' });
  });
});

describe('orgScopeVia', () => {
  it('returns an unscoped filter for a platform operator', () => {
    expect(orgScopeVia(admin, 'clinic')).toEqual({});
  });

  it('nests the scope under the given relation for a real-org caller', () => {
    expect(orgScopeVia(manager, 'clinic')).toEqual({ clinic: { client_org_id: 'org-A' } });
  });

  it('nests the sentinel for a non-operator with no org', () => {
    const scope = orgScopeVia(selfRegisteredPatient, 'clinic') as { clinic: { client_org_id: string } };
    expect(scope.clinic.client_org_id).not.toBe('org-A');
    expect(scope.clinic.client_org_id).toBeTruthy();
  });
});

describe('isSameOrg', () => {
  it('is always true for a platform operator, any record org', () => {
    expect(isSameOrg(admin, 'org-A')).toBe(true);
    expect(isSameOrg(admin, null)).toBe(true);
  });

  it('matches a real-org caller only to their own org', () => {
    expect(isSameOrg(manager, 'org-A')).toBe(true);
    expect(isSameOrg(manager, 'org-B')).toBe(false);
  });

  it('does not let a real-org caller match a legacy org-less record', () => {
    expect(isSameOrg(manager, null)).toBe(false);
  });

  // The single-record equivalent of the orgScope regression test: a
  // self-registered account must never be treated as matching anything,
  // including another org-less (legacy) record.
  it('never matches for a non-operator with no org of their own', () => {
    expect(isSameOrg(selfRegisteredPatient, null)).toBe(false);
    expect(isSameOrg(selfRegisteredPatient, 'org-A')).toBe(false);
  });
});

describe('assertSameOrg', () => {
  it('does not throw when the caller may access the record', () => {
    expect(() => assertSameOrg(manager, 'org-A', 'Clinic')).not.toThrow();
    expect(() => assertSameOrg(admin, 'org-B', 'Clinic')).not.toThrow();
  });

  it('throws NotFoundException — never Forbidden — when the caller may not', () => {
    expect(() => assertSameOrg(manager, 'org-B', 'Clinic')).toThrow(NotFoundException);
    expect(() => assertSameOrg(selfRegisteredPatient, 'org-A', 'Clinic')).toThrow(NotFoundException);
  });

  it('carries the given entity label in the error message', () => {
    expect(() => assertSameOrg(manager, 'org-B', 'Room')).toThrow('Room not found');
  });
});
