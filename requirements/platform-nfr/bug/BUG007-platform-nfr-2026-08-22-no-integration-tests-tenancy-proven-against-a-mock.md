---
id: BUG007
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-22
status: done
parent: REQ035
related: [F-25, BUG006, PLAN028, TP055, TR054]
---

# BUG007 — There were no integration tests; tenant isolation was proven against a mock

## Severity

S2 as a defect in its own right, but it is the **cause** of the S1 findings.
F-01 (`BUG004`) and BUG006 were both live while the suite was green. Neither was
found by a test; both were found by a person reading code.

## Summary

`backend/` had 641 tests across 50 suites and **zero** of them executed a query.
Every one replaces `PrismaService` with a Jest mock and asserts the shape of the
`where` object the service handed it.

That is a useful thing to assert, and it is structurally incapable of catching a
tenant leak, for a precise reason: **a `where` object can look right and still
filter nothing.** `{ client_org_id: undefined }` reads as scoped and is not —
Prisma treats an `undefined` value as "key not supplied". A mock records the key
and passes. A database returns every row.

This is not hypothetical; it is how F-01 and all twelve BUG006 instances shipped.
`04-test-and-quality-strategy.md` reached the same conclusion from the other
direction, and `00-foundation-hardening.md` §4 calls this the "highest leverage
item" of Phase F.

The second-order effect is worse than the missing coverage. Because there was no
way to *prove* isolation, three unit specs had encoded the bug as the expected
value (`expect(where).toEqual(objectContaining({ client_org_id: undefined }))`)
and would have failed against a correct implementation. A test suite that cannot
detect a defect will eventually be edited to agree with it.

## What was missing, concretely

- No real database for tests. No Testcontainers, no `postgres_test` service.
- No `supertest`, and no dependency that could issue an HTTP request to the app.
- No `test/` directory. `jest.config.js` is `rootDir: 'src'`, so there was
  nowhere for a non-unit test to live.
- No fixture with more than one tenant, so "sees everything" and "sees its own"
  produced identical output and could not be told apart.
- No archetype for the caller that actually matters — the self-registered,
  org-less account `auth.service.ts` `register()` mints on demand.

## Fix

A second Jest project (`jest.integration.config.js`, `npm run test:int`) that
boots the **real** `AppModule` against a **real** PostgreSQL and drives it over
**real** HTTP with `supertest`. Nothing is overridden — the value comes entirely
from not substituting anything.

On top of it, the table-driven tenancy matrix from
`00-foundation-hardening.md` §4: 12 domain reads × 9 caller archetypes, plus
cross-tenant single-record reads and cross-tenant writes. 115 assertions.

Two supporting tests ship with it:

- **`matrix-coverage.int-spec.ts`** — the anti-rot gate the plan asks for
  ("make CI fail when a domain has no matrix row — otherwise it rots"). Every
  resolver-bearing directory must be covered, `EXEMPT` with a stated reason, or
  in a **frozen** `KNOWN_GAPS` list. The gap list is asserted by exact equality,
  so it cannot grow quietly and closing an entry means deleting a line.
- **`booking-concurrency.int-spec.ts`** — written now, per the plan, as the
  acceptance criterion for the exclusion constraint Phase 1 §3.3 will add. It is
  `it.failing`, so the suite is green while double-booking is still possible and
  turns red the moment the constraint makes the behaviour correct.

## Verification

`npm run test:int` → **3 suites, 120 tests, green**, ~117s, against
`medibook_postgres_test`. Before the BUG006 fixes the same suite reported 2
failures, both real leaks. See `TR054`.

## What this does not close

- **Coverage is 12 of 22 tenant-scoped domains.** Ten are declared in
  `KNOWN_GAPS`: `analytics`, `availability`, `blocks`, `cancellation-rules`,
  `dashboard`, `notifications`, `org-settings`, `organizations`, `reviews`,
  `services`. Declared, not silently absent — but not covered.
- **No CI (F-26).** The matrix exists; nothing runs it on the default branch.
  That is the last remaining Phase F item.
- The suite needs `--forceExit`; something holds a handle open after teardown
  (`Cannot log after tests are done`). Same family as F-29, which must be fixed
  before CI, since it will hang a runner.
