---
name: medibook-tenant-scoping
description: Enforce this repo's multi-tenant security boundary when writing or reviewing any resolver, service, or Prisma query. Use whenever adding a new backend domain, a create/update/delete mutation, a list query, a @ResolveField, or when reviewing code for cross-tenant leaks. Triggers on "new resolver", "new domain", "add a mutation", "tenant isolation", "client_org_id", "cross-tenant", "org scoping", "can this leak data". Carries the exact orgScope/selfScope patterns, the five known bug instances, and the one live-exploited failure so they aren't rediscovered.
metadata:
  origin: project-specific
  vetted: >-
    Written 2026-08-22 from this repository's own audit findings
    (project-plans/02-findings-register.md F-01/F-04/F-05/F-06, and
    project-plans/03-security-and-tenancy-audit.md), not vendored from an
    external source. Every claim traces to a finding reproduced against the
    running stack in that audit.
---

# MediBook tenant scoping

Multi-tenancy here is a **security boundary, not a filter** (`CLAUDE.md` Hard
Rule 6). This is the most-repeated bug class in the codebase — five domains and
counting — and one instance was live-exploitable at audit time.

## The failure that actually happened

Roughly a dozen services scoped tenants like this:

```ts
where: { ...(user.client_org_id ? { client_org_id: user.client_org_id } : {}) }
```

"Org-less caller sees everything" was written for platform admins. Then
`@Public() register` began minting `patient` accounts with `client_org_id: null`
on demand. Result, reproduced live against the running backend: a brand-new
self-registered account read **every tenant's** clinics, service catalogue with
prices, products, rooms, and full clinician roster. One HTTP call to exploit.

**Never infer privilege from the absence of a field.** Assert the role.

## The correct patterns

### Read scoping

```ts
import { orgScope, orgScopeVia, isPlatformOperator } from '../common/scoping/tenant-scope';

// Model has its own client_org_id column:
const where = { is_deleted: false, ...orgScope(user) };

// Model reaches its org through a relation (Appointments -> clinic):
const where = { is_deleted: false, ...orgScopeVia(user, 'clinic') };
```

A non-operator with a null org must get an impossible filter (`'__no_org__'`),
never `{}`.

### Write-path ownership — the bug class Hard Rule 6 names by name

Any mutation accepting a foreign id (`clinic_id`, `branch_id`, `clinician_id`,
`room_id`, `patient_id`) must validate it belongs to the caller's org **before**
the write:

```ts
if (user.client_org_id) {
  const clinic = await this.prisma.clinics.findUnique({ where: { id: input.clinic_id } });
  if (!clinic || clinic.client_org_id !== user.client_org_id) {
    throw new BadRequestException('Clinic not found');   // don't confirm existence
  }
}
```

Why this keeps recurring: `update`/`delete` look up an existing record first, so
they get the check for free. `create` has no natural place to hang it, so it gets
forgotten. Known instances: `createAvailability`, `createSpacerBlock`,
`createRoomBlock`, `createClinician`, `createAppointment`, `createPatient`.

### Self-scoping — a separate layer, easy to forget

Org scoping answers "which tenant", never "which patient/clinician within it".

```ts
private selfScope(user: JwtPayload) {
  if (user.roles.includes('patient'))
    return { id: user.patient_id ?? '__no_patient_link__' };
  if (user.roles.includes('clinician'))
    return { appointments: { some: { clinician_id: user.clinician_id ?? '__no_clinician_link__' } } };
  return undefined;   // manager/admin/staff legitimately see the org's full list
}
```

**Always use a sentinel, never a skipped filter.** An unlinked account
(`patient_id: null` — both seeded demo accounts are in this state) must fail
closed to empty, not fall through to unscoped.

### `@ResolveField` needs scoping too

`Patient.appointments` shipped with no `@CurrentUser()` and filtered only on
`patient_id` — exposing a patient's cross-org appointment history to any
clinician who could resolve the parent. Resolve-fields are queries; scope them.

## Review checklist

Before approving any tenant-touching change:

- [ ] Every list query uses `orgScope`/`orgScopeVia`, not an inline ternary.
- [ ] Every `create*` taking a foreign id validates ownership before writing.
- [ ] Patient/clinician-facing reads apply `selfScope` with a sentinel.
- [ ] Every `@ResolveField` returning tenant data takes `@CurrentUser()`.
- [ ] Queries that no anonymous or patient caller needs carry `@Auth(...)`.
- [ ] `@Public()` is genuinely required — it removes a security guarantee. There are exactly 16 legitimate ones (8 auth, 5 public, 2 appointment-payments, 1 availability).
- [ ] A spec asserts cross-tenant rejection, and a tenancy-matrix row exists.

## Testing it properly

Unit tests here mock `PrismaService` and assert the shape of the `where` object.
That is useful for regression, but **it cannot catch this bug class** — `{}` is a
perfectly well-formed filter, so a test asserting "org-less caller gets no org
filter" passes while asserting the vulnerability as intended behaviour.

Real proof needs the integration harness: a real Postgres, two seeded orgs, and
a role × domain matrix asserting own-org reads succeed and cross-org reads return
empty or `FORBIDDEN`. See `project-plans/technical-plans/00-foundation-hardening.md` §4.

## The one legitimate exception

`admin` and `super_admin` are platform-wide by design (`client_org_id: null`) and
*should* see across tenants. That is why the fix is an explicit role allow-list
(`isPlatformOperator`), not a null check — the two look identical in the data and
mean opposite things.
