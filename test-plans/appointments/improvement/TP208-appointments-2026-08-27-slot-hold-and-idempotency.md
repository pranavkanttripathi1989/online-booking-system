---
id: TP208
type: improvement
feature: appointments
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ148
related: [PLAN188, TR208]
---

# TP208 — Test plan: server-side slot hold + booking idempotency (P1-05)

Well-scoped slice against an already-proven pattern (P1-04's own
Redis-cached, dialect-paired approach) — suggestion stage skipped per
`CLAUDE.md`'s conditional rule, test plan drafted directly.

## Backend — unit

1. `SlotHoldsService.holdSlot` acquires via `SET NX`; rejects with a clear
   message when already held; two holds for the same clinician/time never
   both succeed.
2. `releaseSlot` only deletes when the current value matches the given
   token (no stealing back a slot someone else already re-acquired); is a
   no-op when nothing is held.
3. `consumeIfOwned` releases when a token is given; silently no-ops when
   none is given.
4. `listHeldStartTimesForDay` uses `SCAN` (never `KEYS`), filters to the
   given day window, returns empty when nothing is held.
5. `AppointmentsService.create()`: a repeat `idempotency_key` short-
   circuits to the original appointment without re-running validation
   (`clinics.findUnique` never called); writes the key row inside the
   same transaction as a first-time create; never writes a row when no
   key is supplied (unchanged pre-existing behaviour); a genuinely
   concurrent duplicate-key submit (simulated via a rejected
   `$transaction`) returns the winner's appointment instead of throwing;
   consumes the hold on success when a `hold_token` is supplied, never
   touches the hold service otherwise.
6. `AppointmentsService.holdSlot()`/`releaseSlot()`: maps
   `SlotHoldsService`'s camelCase result to `SlotHoldType`'s own
   snake_case fields (regression test for the field-mapping bug found
   live); `releaseSlot` always resolves `true` and passes through
   correctly.
7. `PublicService.bookPatientAppointment()`: the identical idempotency-key
   and hold-consumption coverage as (5), in the public/camelCase dialect.
8. `PublicService.holdSlot`/`releaseSlot`: compose `date`+`startTime` into
   the ISO instant `SlotHoldsService` expects.
9. `PublicService.getAppointments`: appends a synthetic entry for every
   actively-held start time alongside real booked rows; returns only real
   rows when nothing is held.

## Backend — integration (real Postgres + real Redis)

10. A second `holdAppointmentSlot` for the same clinician/time is rejected
    while the first is active; an explicit `releaseAppointmentSlot` frees
    it immediately, without waiting for the TTL.
11. A repeat `idempotency_key` on `createAppointment`, called twice
    sequentially, returns the same appointment id both times; exactly one
    row persists.
12. Five truly-concurrent `createAppointment` calls carrying the same
    `idempotency_key` for the same brand-new slot: every one succeeds,
    every one returns the SAME appointment id, and exactly one row
    persists — the actual "double-tap cannot create two appointments"
    proof, distinct from `booking-concurrency.int-spec.ts`'s own
    "only one of N genuinely-different bookings wins" proof.
13. `matrix-coverage.int-spec.ts` stays green (no new domain
    misclassification from the new `slot-holds` module, which has no
    resolver of its own).

## Frontend

14. Every existing Step-0 slot-selection test in `booking/index.test.jsx`
    continues to pass with the real `holdPublicSlot`/`releasePublicSlot`
    mutations wired in (not just the local `bookingData.slot` update).
15. Lint, build, and `size-limit` all green; lint warning count does not
    exceed the existing ratchet baseline.

## Deliberately not covered (see REQ148/PLAN188's own scope notes)

- A live-browser pass of the countdown UI itself (ticking display, the
  expiry-returns-to-picker flow) — no browser-automation tool was
  available in this session; the underlying mutations and their wiring
  are covered by (10)–(14) above, and the countdown component's own
  render logic is simple enough (a `setInterval` + a formatted
  `mm:ss`) that this is a reasoned, stated gap, not a silent one.
- Full wizard-state resumability (out of scope, see REQ148).
