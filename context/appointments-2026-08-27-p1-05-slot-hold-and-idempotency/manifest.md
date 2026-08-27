---
id: CTX-appointments-2026-08-27-p1-05-slot-hold-and-idempotency
type: improvement
feature: appointments
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ148
related: [PLAN188, TP208, TR208]
---

# appointments — server-side slot hold + booking idempotency (2026-08-27)

Phase 1 slice **P1-05** (`project-plans/phase-plans/01-phase1-close-the-gates.md`),
the 5th of a 15-slice batch. Closes `FRONTEND_RULES.md`'s `BOOK-2`
(server-side slot hold, visible countdown) and `BOOK-3` (client-generated
idempotency key on every booking mutation).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ148 | [Server-side slot hold + booking idempotency](../../requirements/appointments/improvement/REQ148-appointments-2026-08-27-slot-hold-and-idempotency.md) |
| implementation-plans | PLAN188 | [implementation plan](../../implementation-plans/appointments/improvement/PLAN188-appointments-2026-08-27-slot-hold-and-idempotency.md) |
| test-plans | TP208 | [test plan](../../test-plans/appointments/improvement/TP208-appointments-2026-08-27-slot-hold-and-idempotency.md) |
| test-results | TR208 | [results](../../test-results/appointments/improvement/TR208-appointments-2026-08-27-slot-hold-and-idempotency.md) |

## What shipped

- **Idempotency key** (`AppointmentIdempotencyKeys`, durable) on both
  GraphQL dialects' booking mutations — a repeat key is a no-op returning
  the original appointment, proven under real concurrency (5 truly-
  parallel identical requests all return the same id, exactly one row
  persists).
- **Slot hold** (`SlotHoldsService`, Redis `SET NX` + TTL, no resolver of
  its own) on both dialects — a held slot surfaces as unavailable via the
  same `getAppointments` list the frontend already disables from, no new
  frontend logic needed to hide it.
- **Frontend**: `booking/index.jsx`'s slot picker now holds on selection,
  shows a real countdown from step 1 onward, returns to the picker on
  expiry, and generates/persists a client-side idempotency key across a
  reload (not full wizard-state resumability — see REQ148's own scope
  note).

## Two real bugs found and fixed before this shipped

1. `SlotHoldsService` returns camelCase; the canonical dialect's
   `SlotHoldType` is snake_case — an unmapped return surfaced live as
   `"Cannot return null for non-nullable field SlotHoldType.hold_token"`.
   Fixed with an explicit mapping + a regression unit test.
2. The idempotency race-recovery check only looked for a winning key row
   on a `P2002` — live concurrency testing showed 4 of 5 truly-parallel
   duplicate-key requests actually lose to the EXCLUDE constraint first
   (they're also 5 genuinely-conflicting bookings), surfacing the
   pre-existing "slot unavailable" message instead of the intended no-op.
   Fixed by widening the winner-lookup to run on ANY transaction failure
   when a key is present, confirmed by a new 5-way-concurrency integration
   test.

## One environment gap found and fixed, unrelated to this slice's own logic

`test/integration/setup/env.ts`'s `REDIS_URL ?? 'redis://localhost:6379'`
fallback has never actually applied — `global-setup.ts`'s own
`@prisma/client` import triggers Prisma's implicit `.env` auto-load first
(same process, `--runInBand`), setting `REDIS_URL` to the Docker-Compose-
only `redis://redis:6379` before `env.ts`'s own `??` ever sees an unset
value. Invisible until this slice because no prior integration-suite path
ever exercised Redis. Fixed by stripping that one known-wrong value
explicitly, matching `TEST_DATABASE_URL`'s own existing guard pattern in
the same file.

## Verification

Backend: 102/102 unit suites, 1679/1679 tests; 5/5 integration suites
(390/390 tests, including the new
`booking-hold-and-idempotency.int-spec.ts`); `tsc --noEmit`/`eslint`
clean; `matrix-coverage` clean (no new domain). Frontend:
`booking/index.test.jsx` 8/8 with real hold/release mutations now
exercised by the existing slot-selection tests; lint unchanged at the
1,906-warning ratchet baseline; build and `size-limit` green. See TR208
for the full account, including the frontend full-suite run.
