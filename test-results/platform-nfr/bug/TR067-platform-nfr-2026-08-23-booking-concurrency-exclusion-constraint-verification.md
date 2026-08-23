---
id: TR067
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP068
related: [BUG017, PLAN041]
---

# TR067 — Results for the booking-concurrency exclusion constraint

Executed 2026-08-23 against the real dev backend and the integration test
harness (`postgres_test`), on `master`.

| Case | Result | Evidence |
|---|---|---|
| TC-01 pre-fix input broken | **pass** | Diagnostic run: `succeeded: 0`, all 5 results carried GraphQL `BAD_USER_INPUT` errors naming the mismatched fields |
| TC-02 corrected input reproduces the real bug | **pass** | Diagnostic run: `succeeded: 5` |
| TC-03 constraint applied | **pass** | Final run: `succeeded: 1`, `persisted: 1` |
| TC-04 clean error message | **pass** | All 4 rejected results: `"This time slot is no longer available"` |
| TC-05 back-to-back allowed | **pass** | Constraint's `'[)'` bound spec verified against manual scratch inserts before writing the real migration |
| TC-06 cancelled row excluded | **pass** | Scratch verification: a `status: 'cancelled'` row at an identical slot inserted without conflict |
| TC-07/07b/08/09 error-mapping unit tests | **pass** | 4/4 new cases in `appointments.service.spec.ts` (clinician-constraint, room-constraint, deadlock, unrelated-error-not-swallowed) |
| TC-10 5x back-to-back | **pass** | 5/5 green runs, one run measured at 4,259ms (vs. ~300ms typical) — consistent with a real deadlock occurring and being correctly caught |
| TC-11 full integration suite | **pass** | 3 suites / 183 tests (re-run again after adding the room constraint's migration), including `tenancy.int-spec.ts` and `matrix-coverage.int-spec.ts` — no regressions |
| TC-12 backend static checks | **pass** | 53 suites / 687 tests, `tsc --noEmit` clean, full `eslint src/**/*.ts` clean |
| TC-13 live concurrency against the real dev DB | **pass** | 5 parallel `curl` processes against real clinician `8e9ed6bf-...`/product `caa89f8e-...`/patient `69168728-...` at `2026-11-20T14:00:00Z` — 1 real id returned, 4 `"This time slot is no longer available"`. Row `133f0ef7-...` (and its status log) deleted afterward |

## Commit

Pending — see the commit immediately following this doc.
