---
id: TP055
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-22
status: approved
parent: BUG007
related: [BUG006, PLAN028, TR054, F-25, F-01]
---

# TP055 — Integration harness and tenancy matrix verification

## Suggestion stage

Skipped, per the `CLAUDE.md` conditional rule (`REQ013` Phase D). The
verification method is prescribed in detail by
`technical-plans/00-foundation-hardening.md` §4 — the archetype table, the
expected outcomes, the anti-rot requirement and the concurrency test are all
specified there. There was nothing exploratory to draft candidates for. Skipping
the stage is not skipping review.

## What makes this plan unusual

The subject under test *is* a test suite, so "the tests pass" proves very little
on its own — a matrix that asserted nothing would also pass. The cases below are
therefore split in two:

- **TC-01…TC-06** prove the harness is real (it would fail if the code were
  wrong).
- **TC-07…TC-14** are the matrix itself.

TC-03 is the one that matters most. A test suite must be shown capable of
failing before a green result from it means anything.

## Harness integrity

| ID | Case | Expected |
|---|---|---|
| TC-01 | `postgres_test` reachable on 5433, isolated from dev | `\dt` lists migrated tables; `medibook_postgres` untouched |
| TC-02 | `env.ts` refuses a dev-looking `TEST_DATABASE_URL` | throws before any connection |
| TC-03 | **The matrix can fail** | run against unfixed code → the known leaks are reported as failures, naming the leaked row id |
| TC-04 | Real guard chain, not stubs | unauthenticated call → `UNAUTHENTICATED` from the real `GqlAuthGuard` |
| TC-05 | Real database, not a mock | fixture row counts read back through Prisma |
| TC-06 | Unit config unaffected | `npx jest --maxWorkers=2` still discovers only `src/**/*.spec.ts` |

## The matrix

| ID | Case | Expected |
|---|---|---|
| TC-07 | platform operator (`admin`, `super_admin`, null org) reads any domain | sees **both** orgs' rows |
| TC-08 | org-A caller (`manager`/`clinician`/`staff`/`patient`) reads any domain | contains A's id, **does not contain** B's id |
| TC-09 | org-B caller, same domains | mirror of TC-08 |
| TC-10 | **self-registered caller (patient role, NO org, NO patient link)** | sees **neither** org's rows |
| TC-11 | unauthenticated | `UNAUTHENTICATED` on every non-`@Public()` operation |
| TC-12 | caller whose role the resolver does not admit | `FORBIDDEN` |
| TC-13 | single-record read of another org's row by id | falsy — never the row (IDOR path is separate code from the list path) |
| TC-14 | cross-tenant **write** (`createRoom`, `createAppointment` into another org's clinic) | rejected **and** nothing persisted — asserted against the database, not the response |

TC-14 checks the database because a mutation can return an error after having
already written. CLAUDE.md Hard Rule 6 records `create*` as a repeated real bug
class for exactly this reason.

## Anti-rot and forward-looking

| ID | Case | Expected |
|---|---|---|
| TC-15 | every resolver domain is covered, `EXEMPT`, or in `KNOWN_GAPS` | no unclassified domain |
| TC-16 | `KNOWN_GAPS` matches the real gap set **exactly** | equal in both directions — the backlog cannot grow silently, and a stale entry also fails |
| TC-17 | booking concurrency: N simultaneous bookings of one slot | exactly one succeeds — **expected to fail today**, written as `it.failing` per the plan, as the acceptance criterion for Phase 1 §3.3's exclusion constraint |

## Regression suites

| ID | Case | Expected |
|---|---|---|
| TC-18 | backend unit suite after the BUG006 service changes | green; specs that asserted `client_org_id: undefined` corrected, not deleted |
| TC-19 | new unit regressions for the org-less non-operator | `where` carries the `'__no_org__'` sentinel — present and unmatchable, not absent |
| TC-20 | `npx eslint "{src,apps,libs,test}/**/*.ts"` | clean |
| TC-21 | `npx tsc --noEmit` | clean — proves `isolatedModules` is not hiding type errors |

## Out of scope

CI enforcement (F-26), the ten `KNOWN_GAPS` domains, load/soak testing, and
whether `messages`/`test-results` should carry `@Auth()` decorators.
