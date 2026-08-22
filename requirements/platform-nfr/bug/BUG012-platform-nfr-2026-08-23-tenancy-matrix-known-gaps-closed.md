---
id: BUG012
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ035
related: [BUG007, BUG011]
---

# BUG012 — The tenancy matrix's 10 KNOWN_GAPS domains are closed, and three real auth gaps found closing them

## Severity

S2. Three previously-undiscovered authorization gaps in real, org-scoped
(and in one case cross-tenant-reachable) data — no anonymous/cross-tenant
data-disclosure path like `BUG006`'s, since the underlying service-level
scoping was still correct for two of the three, but any authenticated role
(including `patient`) could reach data it should never see, and one query
had zero scoping of any kind.

## How this was found

`project-plans/06-execution-plan.md` names P0 ("stabilise and secure") and
P1 ("prove the boundary") as a hard prerequisite before any of the 22
PRD-derived requirements (`REQ014`–`REQ035`) may proceed to implementation
planning. `CLAUDE.md`'s "Phase F COMPLETE" claim maps to P0 plus part of
P1, but P1's own DoD — "the tenancy matrix covers every domain" — was not
met: `BUG007` closed the harness but explicitly left 10 of 21 tenant-scoped
domains in a frozen `KNOWN_GAPS` list. Asked by the user to finish P1 before
starting any PRD work, this is the first of three sequenced slices (the
other two — frontend unit tests, and a separately seeded e2e database —
are separate future work).

Matching the project's own established pattern ("a resolver-vs-real-source
cross-check like this has found a real, previously-unfixed security bug in
every domain checked closely so far" — `CLAUDE.md`, Priority 1), reading
each of the 10 gap domains' real resolver/service source to write its
matrix case surfaced three real bugs, and one domain-shape correction to
the plan as originally scoped.

## The three real gaps

### 1. `availabilities` had no `@Auth()` at all

`availability.resolver.ts`'s list query for `ClinicianAvailability` rows had
no role gate, unlike every one of its sibling mutations
(`manager`/`admin`/`super_admin`). Any authenticated role, including
`patient`, could list every availability template in their org. Fixed to
`@Auth('manager', 'admin', 'super_admin', 'staff')` — `staff` is included
because `calendar/index.jsx` (nav-listed for staff, with no `RoleGuard` at
the route level) is a real, verified caller of this exact query.

### 2. `spacerBlocks`/`roomBlocks` had no `@Auth()` at all

Same shape as #1, in `blocks.resolver.ts`. Fixed to
`@Auth('manager', 'admin', 'super_admin')`, matching the only real caller
(`manager/Blocks.jsx`, itself gated to that role set by `App.jsx`'s
`RoleGuard` on `/manager/blocks`).

### 3. `getSpacerBlocks` had no `@Auth()` AND no scoping of any kind

Worse than #1/#2: this query takes a caller-supplied `clinicianId` argument
directly, and `blocks.service.ts`'s implementation had zero org- or
self-scoping — no `orgScopeVia`, no `assertClinicianAccess`-style check,
nothing. Any authenticated caller could pass an arbitrary `clinicianId`
belonging to any other clinician in any other organization and read their
block schedule (times, reasons). This is the exact IDOR shape
`availability.service.ts`'s `assertClinicianAccess` helper already exists
to prevent for the sibling domain — `blocks.service.ts` simply never had an
equivalent. Fixed with the same pattern: `@Auth('manager', 'admin',
'super_admin', 'clinician')` (clinician included because
`clinician/Dashboard.jsx` self-service is a real caller) plus a service-level
check that rejects a `clinician` caller targeting anyone but their own id,
and `assertSameOrg` for every other role.

## The plan correction found during implementation

The approved implementation plan (`PLAN033`) originally scoped `notifications`
as a real matrix case (self-scope caveat noted in a comment) alongside
`org-settings` (adapted to compare a field value) and treated only
`organizations` as needing exemption. Tracing the matrix's actual runner
(`tenancy.int-spec.ts`) during implementation found two more mismatches:

- `org-settings`'s `myOrgBranding` is `nullable: true` and returns the
  caller's own org only — for a platform operator (no org), it returns
  `null`, not the union of both orgs the runner's `'all'` expectation
  requires for that actor type. It cannot fit the generic shape at all.
- `notifications` is scoped by specific `user_id`, not org. The runner
  asserts every actor sharing an org sees the *same* row; for a per-user-scoped
  domain, only the exact row's owner does — every other same-org actor
  (verified live: `clinicianA`, `staffA`, `patientA` against `managerA`'s own
  notification) would see an empty result and fail the assertion.

Both moved to `EXEMPT` alongside `organizations`, each with its own stated
reason — matching this project's established practice of correcting a
finding's write-up in place rather than silently absorbing the difference
(`BUG007`'s own "three corrections to the finding as written" section is the
precedent).

## Fix

- `availability.resolver.ts`, `blocks.resolver.ts`, `blocks.service.ts`: the
  three `@Auth()`/scoping fixes above, each verified against real frontend
  callers first (Hard Rule 7). New/updated unit coverage:
  `availability.resolver.spec.ts` (existing test corrected — see below),
  `blocks.resolver.spec.ts` (new file), `blocks.service.spec.ts` (extended).
- `test/integration/setup/domain-cases.ts`: 7 new `DomainCase` entries
  (`reviews`, `cancellation-rules`, `availability`, `analytics`, `blocks`,
  `dashboard`, `services`).
- `test/integration/setup/fixture.ts`: new org-A/org-B rows for `Reviews`,
  `ProductCancellationRules` (clinic-scoped, not product-scoped — the
  `ProductCancellationRules_scope_check` constraint forbids both at once),
  `ClinicianAvailability`, and `SpacerBlocks`.
- `test/integration/matrix-coverage.int-spec.ts`: `organizations`,
  `org-settings`, and `notifications` added to `EXEMPT` with stated reasons;
  `KNOWN_GAPS` is now empty.

## One existing unit test corrected, not just extended

`availability.resolver.spec.ts` had `expect(reflector.get(ROLES_KEY,
AvailabilityResolver.prototype.availabilities)).toBeUndefined()` —
asserting the ungated state as correct, the same "test pins the bug in
place" pattern `BUG007` already found three instances of. Corrected to
assert the real, now-gated role list instead of deleting the coverage.

## Verification

`npm run test:int`: 183/183 passing (up from 120), including
`matrix-coverage.int-spec.ts` confirming `KNOWN_GAPS` is empty and every
resolver domain is classified. `npx jest --maxWorkers=2`: 660/660 (52
suites). `npx eslint "{src,apps,libs,test}/**/*.ts"` and `npx tsc --noEmit`:
clean. Live-verified with real JWTs against the running stack: a `patient`
token rejected with `FORBIDDEN` on all three previously-ungated queries; a
`staff` token succeeds on `availabilities`; a `manager` token succeeds on
`spacerBlocks`; an unlinked demo `clinician` account (`clinician_id: null`)
correctly rejected with `NotFoundException` on `getSpacerBlocks` for a real
clinician id, proving the self-scope fix fails closed rather than open. See
`TR059`.

## What this does not close

- The booking-concurrency test (P1.4) already existed
  (`booking-concurrency.int-spec.ts`, deliberately `it.failing`) before this
  slice — no work needed, and none done.
- P1's remaining two items — a realistic seed dataset with a separate e2e
  database (P1.5), and frontend unit tests for `AuthContext`/`ProtectedRoute`/
  booking-wizard validation/currency-date utils (P1.6) — are sequenced as
  separate future slices, not part of this one.
- Neither `org-settings` nor `notifications` gained any NEW test coverage
  from this slice — they were already untested by the matrix before, and
  remain so; only their *classification* (gap → exempt) changed.
