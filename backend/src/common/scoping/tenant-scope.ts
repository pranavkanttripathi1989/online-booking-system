import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';

// F-01 fix (project-plans/02-findings-register.md) — the shared helper that
// replaces the `user.client_org_id ? { client_org_id: user.client_org_id } : {}`
// pattern independently reinvented across clinics/rooms/services/products/
// clinicians.
//
// That pattern reads as "org-less callers see everything", which was safe
// while the only way to hold a null org was to be seeded as a platform
// operator. It stopped being safe the moment `register` (auth.service.ts)
// began minting `patient`-role accounts with `client_org_id: null` on demand
// — reproduced live: a fresh self-registered account read every tenant's
// clinics, full service/product catalogues with prices, all rooms, and the
// full clinician roster, via a single HTTP call, before this fix.
//
// The bug was inferring privilege from the *absence* of a field. This module
// asserts the role instead: only `admin`/`super_admin` are platform-wide by
// design (CLAUDE.md's own documented convention, predating self-registration).
// Every other caller with no org of their own — which in practice is only the
// self-registration path — gets an impossible sentinel filter, never an
// unscoped one, matching the fail-closed sentinel pattern `selfScope()`
// already uses correctly elsewhere in this codebase (patients.service.ts,
// appointments.service.ts) for patient/clinician self-scoping.

const PLATFORM_ROLES = ['admin', 'super_admin'] as const;

// Cannot collide with a real uuid primary key — every findMany/findFirst
// against this sentinel returns zero rows rather than skipping the filter.
const NO_ORG_SENTINEL = '__no_org__';

export function isPlatformOperator(user: JwtPayload | null | undefined): boolean {
  return user?.roles?.some((role) => (PLATFORM_ROLES as readonly string[]).includes(role)) ?? false;
}

/**
 * Prisma `where` fragment for a model with its own `client_org_id` column.
 * Platform operators get no filter (see every org, the existing documented
 * default for legacy pre-org-linkage rows). Everyone else is scoped to their
 * own org, or to the sentinel if they have none — never to `{}`.
 */
export function orgScope(user: JwtPayload, column = 'client_org_id'): Record<string, unknown> {
  if (isPlatformOperator(user)) return {};
  return { [column]: user?.client_org_id ?? NO_ORG_SENTINEL };
}

/**
 * Same as `orgScope`, for a model that has no `client_org_id` of its own and
 * is scoped indirectly through a relation (e.g. Rooms -> clinic.client_org_id).
 */
export function orgScopeVia(user: JwtPayload, relation: string, column = 'client_org_id'): Record<string, unknown> {
  if (isPlatformOperator(user)) return {};
  return { [relation]: { [column]: user?.client_org_id ?? NO_ORG_SENTINEL } };
}

/**
 * True if this caller may access a record belonging to `recordOrgId`.
 * A non-operator caller with no org of their own never matches anything,
 * including another org-less legacy record — fail closed, not "compare null
 * to null and pass".
 */
export function isSameOrg(user: JwtPayload, recordOrgId: string | null | undefined): boolean {
  if (isPlatformOperator(user)) return true;
  if (!user?.client_org_id) return false;
  return recordOrgId === user.client_org_id;
}

/**
 * Single-record ownership guard for findOne/update/remove paths. Always
 * throws NotFoundException, never Forbidden — matches this codebase's
 * existing convention of not confirming a cross-tenant record's existence.
 */
export function assertSameOrg(user: JwtPayload, recordOrgId: string | null | undefined, entityLabel: string): void {
  if (!isSameOrg(user, recordOrgId)) {
    throw new NotFoundException(`${entityLabel} not found`);
  }
}

/**
 * The org id to stamp on a NEW tenant-scoped row.
 *
 * The read helpers above have a write-path counterpart that is easy to miss,
 * and several services got it wrong the same way: `client_org_id:
 * user.client_org_id ?? undefined` on a `create`. That is not a filter, so it
 * does not leak on read — it silently writes an ORG-LESS ROW, which then
 * belongs to no tenant and (before `orgScope`) was visible to everyone.
 *
 * Platform operators legitimately create global rows, so `undefined` is right
 * for them. For anyone else, having no org is not a licence to create an
 * unscoped record — it is a bug in the caller's account, and it fails closed.
 */
export function orgIdForWrite(user: JwtPayload, entityLabel: string): string | undefined {
  if (isPlatformOperator(user)) return user?.client_org_id ?? undefined;
  if (!user?.client_org_id) {
    throw new ForbiddenException(`Cannot create ${entityLabel} without an organization`);
  }
  return user.client_org_id;
}
