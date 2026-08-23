---
id: TP068
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: BUG017
related: [PLAN041, TR067]
---

# TP068 — Verification for the booking-concurrency exclusion constraint

## Per-item contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | Pre-fix diagnostic: `it.failing` test's real input against the real schema | Fails GraphQL validation on all 5 attempts (`succeeded: 0`) — proves the test itself was broken before any constraint work started |
| TC-02 | Corrected input, still no constraint | `succeeded: 5` — the real double-booking bug, genuinely reproduced |
| TC-03 | Corrected input, constraint applied | `succeeded: 1`, `persisted: 1` |
| TC-04 | Every rejected attempt's error message | `"This time slot is no longer available"`, never a raw Postgres/Prisma error |
| TC-05 | Back-to-back slot (ends exactly when a new one starts) | Allowed — `'[)'` bounds, not treated as overlapping |
| TC-06 | A cancelled/no_show/soft-deleted row at the same slot | Does not block a new booking — excluded by the constraint's `WHERE` clause |
| TC-07 | Unit: exclusion-violation error (`23P01`-shaped message, clinician constraint) | Maps to the clean message |
| TC-07b | Unit: exclusion-violation error naming the room constraint | Also maps to the clean message |
| TC-08 | Unit: deadlock error (`"deadlock detected"`) | Also maps to the clean message |
| TC-09 | Unit: an unrelated database error | Propagates unmapped, not swallowed behind the friendly message |
| TC-10 | Integration test run 5x back-to-back | 5/5 green — the deadlock path is timing-dependent, one run isn't enough confidence |
| TC-11 | Full integration suite (183 tests) | No regressions |
| TC-12 | Full backend unit suite, `tsc --noEmit`, `eslint` | All clean |
| TC-13 | Live, against the real dev database: 5 genuinely concurrent (separate OS processes, not `Promise.all`) `createAppointment` requests for the same real slot | Exactly 1 succeeds, 4 get the clean message |

## How this was checked

TC-01/02 via `npm run test:int -- booking-concurrency` with a temporary
diagnostic `it`/console.log (reverted before finalizing). TC-03–06 via the
finalized integration test. TC-07–09 via Jest unit tests against a mocked
`$transaction`. TC-10/11 via repeated/full `npm run test:int` runs. TC-12
via the backend container's own commands. TC-13 via 5 parallel `curl`
processes (shell background jobs + `wait`) against the real running dev
backend, using real seeded clinician/product/patient ids — the created row
deleted afterward.
