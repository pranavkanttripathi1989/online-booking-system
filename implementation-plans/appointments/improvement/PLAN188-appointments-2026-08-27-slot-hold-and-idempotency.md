---
id: PLAN188
type: improvement
feature: appointments
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ148
related: [TP208, TR208]
---

# PLAN188 — Server-side slot hold + booking idempotency (P1-05)

## Design

**Idempotency key** — `AppointmentIdempotencyKeys` (new table,
`idempotency_key` unique, `appointment_id` unique, cascades on delete).
`create()`/`bookPatientAppointment()` both: (1) pre-check the key before
any validation runs — a repeat key short-circuits to the original
appointment; (2) write the key row inside the SAME transaction as the
appointment insert, so a losing concurrent duplicate rolls back cleanly
with no orphan row; (3) on ANY transaction failure (not just a P2002 on
the key's own uniqueness — see the concurrency finding below), re-check
for a winning key row before falling through to the pre-existing
error-mapping, so a request that "lost" to another copy of itself still
returns the shared appointment rather than a confusing rejection.

**Slot hold** — `SlotHoldsService` (new `src/slot-holds/` module, no
resolver of its own — deliberately, so it never registers as a new
tenancy-matrix domain). Redis `SET key NX EX 600` is the atomic
"acquire iff absent" primitive; a safe `releaseSlot` only deletes if the
current value still matches the caller's own token (so a late release
after a TTL expiry + new acquisition can't steal the slot back).
`listHeldStartTimesForDay` (SCAN, never KEYS) backs
`getAppointments`'s new synthetic held-slot rows, so a held slot reads as
unavailable via the SAME `existingApps.includes(slot)` disabling logic
the frontend already had — zero new frontend code needed to hide it, only
to explain why (the countdown).

Both `AppointmentsResolver` (canonical, snake_case `SlotHoldType`) and
`PublicResolver` (public, camelCase `PublicSlotHoldType`) expose
hold/release mutations backed by the same `SlotHoldsService`, matching
this codebase's "shared lower-level service, dialect-specific
resolver/entity shape" pattern used elsewhere.

## Two real bugs found before this shipped

1. **Field-name mismatch.** `SlotHoldsService` returns camelCase
   (`holdToken`/`expiresAt`); the canonical dialect's `SlotHoldType` is
   snake_case. Returning the service's shape unmapped from the resolver
   surfaced live as `"Cannot return null for non-nullable field
   SlotHoldType.hold_token"` the first time this ran a real HTTP round
   trip — the mocked-Prisma unit suite never would have caught it, since
   the mock's own shape only needs to satisfy the service call, not
   GraphQL's field-matching. Fixed by mapping explicitly in
   `AppointmentsService.holdSlot()`, and a dedicated unit test now pins
   the mapped return shape so this can't regress silently.
2. **The idempotency race-recovery check was too narrow.** The first
   draft only re-checked for a winning key row on a `P2002` (the key's
   own uniqueness violation). Live-verified under genuine concurrency (5
   truly-parallel requests, same idempotency key, same brand-new slot):
   only 1 of 5 actually raced on the key's own uniqueness — the other 4
   lost to the EXCLUDE constraint *first* (they are, after all, also 5
   genuinely-conflicting booking attempts for the same slot), so they hit
   the pre-existing "This time slot is no longer available" branch
   instead of the idempotency no-op path, which is exactly the confusing
   outcome `BOOK-3` exists to prevent. Fixed by widening the winner-lookup
   to run on ANY transaction failure when an idempotency key is present,
   before any specific error-mapping branch — confirmed via a new
   integration test asserting all 5 concurrent requests return the SAME
   id, not just that one of them succeeds.

## A genuine, previously-invisible environment gap found and fixed

`test/integration/setup/env.ts`'s own `REDIS_URL = process.env.REDIS_URL
?? 'redis://localhost:6379'` line has never actually applied: **the same
process's `global-setup.ts` imports `@prisma/client`**, which triggers
Prisma's own implicit `.env` auto-load as a side effect — before
`env.ts`'s `setupFiles` entry runs, since both execute in the same
`--runInBand` process — setting `process.env.REDIS_URL` to
`backend/.env`'s `redis://redis:6379` (a Docker-Compose-only hostname)
first. `env.ts`'s `??` fallback then saw an already-set value and did
nothing. This was invisible until this slice because no prior
integration-suite code path ever actually talked to Redis (ioredis
retries a DNS failure for `redis` with backoff rather than failing fast,
so it manifests as a ~10s-per-call `MaxRetriesPerRequestError`, not an
immediate error). Fixed: `env.ts` now strips and replaces specifically
that known-wrong compose-internal value rather than relying on `??`,
matching `TEST_DATABASE_URL`'s own existing guard pattern one section
above it in the same file. A real, deliberately-exported CI override
still wins.

## Frontend

`booking/index.jsx` (the public patient wizard — this is where
`FRONTEND_RULES.md`'s `BOOK-*` rules actually live):

- `selectSlot()` replaces the bare `setBookingData` slot click handler —
  releases any prior hold, sets the slot optimistically (so `Next Step`'s
  own gating stays synchronous), then calls `holdPublicSlot`. A rejection
  (a genuine race within the polling window) shows a warning snackbar and
  leaves the slot selected but unheld — the EXCLUDE constraint is still
  the real backstop at booking time.
- `HoldCountdown` — a real countdown from the server-issued `expiresAt`,
  shown from step 1 onward (step 0 already shows the held slot as
  selected). On reaching zero, resets to step 0, clears `bookingData.slot`,
  and shows a clear message (`BOOK-2`'s own "return to the picker with
  other choices intact").
- `getOrCreateIdempotencyKey()`/`clearIdempotencyKey()` — persisted in
  `localStorage`, generated once per `PaymentForm` mount (`useMemo`,
  stable across a retry of the SAME flow, e.g. a failed Razorpay
  verification followed by hitting "Pay" again), cleared only once the
  ENTIRE booking+payment flow completes — a retry of an earlier failed
  step correctly reuses the same key rather than minting a new one.
- Release-on-unmount is best-effort (a `useEffect` cleanup), matching
  `BOOK-2`'s own "UX, not correctness" framing — a hard tab close is
  caught by the server-side TTL, not this.

Deliberately not built (see `REQ148`'s own "Deliberately NOT built"):
full wizard-state resumability; a hold on the internal staff wizard or on
session/hybrid-mode selection.

## Testing

Backend: `appointments.service.spec.ts` (idempotency pre-check/write/
race-recovery, hold-consumption, and the `holdSlot()`/`releaseSlot()`
field-mapping bug's own regression test), `public.service.spec.ts`
(the public dialect's identical coverage plus `getAppointments`'
held-slot surfacing), `slot-holds.service.spec.ts` (new, 10 cases —
acquire/reject, safe release, `consumeIfOwned`, `listHeldStartTimesForDay`
via `SCAN`). Integration: new
`test/integration/booking-hold-and-idempotency.int-spec.ts` — a real
hold/reject/release/re-hold round trip over real Redis, a sequential
repeat-key no-op, and the 5-way genuine-concurrency proof, all against
the real `AppModule` + real Postgres + real Redis. `matrix-coverage`
confirmed clean (`slot-holds` has no resolver of its own, so it never
registers as a domain needing classification).

Frontend: `booking/index.test.jsx` extended with hold/release mocks
(every existing slot-click test now exercises the real mutation call,
not just the local state update); lint/build/size-limit all green,
lint warning count unchanged (1,906, the existing ratchet baseline).

## Outcome

Backend: 102/102 unit suites, 1679/1679 tests; 5/5 integration suites,
390/390 tests; `tsc --noEmit` and `eslint` both clean. Frontend:
`booking/index.test.jsx` 8/8; full-tree lint clean at the unchanged
1,906-warning baseline; build and `size-limit` both green. See TR208 for
the full run log.
