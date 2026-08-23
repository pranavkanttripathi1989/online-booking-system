---
id: CTX-scheduling-engine-2026-08-24-req017
type: requirement
feature: scheduling-engine
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ017
related: [REQ014, PLAN055, TP082, TR081]
---

# scheduling-engine — REQ017 P0 slice: session/token mode + multi-resource booking (2026-08-24)

Slice 1 of a 6-requirement Phase 1 MVP pass (REQ017 → REQ020 → REQ021 →
REQ019 → REQ018 → REQ032, dependency order). REQ017 is the PRD's own
critical path ("the heart of the product") and blocks REQ018/REQ019.

REQ017 itself splits into P0 (this slice) and P1 (explicitly deferred, per
the requirement's own phase assignment — not silently dropped). This bundle
covers the P0 slice only; REQ017 stays `in-progress` until the P1 items are
picked up in a future slice.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ017 | [dual-mode scheduling: session/token mode, multi-resource booking, slot-integrity](../../requirements/scheduling-engine/requirement/REQ017-scheduling-engine-2026-08-22-dual-mode-calendar-and-slot-integrity.md) |
| implementation-plans | PLAN055 | [session/token mode + multi-resource booking (P0 slice)](../../implementation-plans/scheduling-engine/requirement/PLAN055-scheduling-engine-2026-08-24-session-token-mode-and-multi-resource-booking.md) |
| test-plans | TP082 | [verification plan](../../test-plans/scheduling-engine/requirement/TP082-scheduling-engine-2026-08-24-session-token-mode-verification.md) |
| test-results | TR081 | [verification results — pass](../../test-results/scheduling-engine/requirement/TR081-scheduling-engine-2026-08-24-session-token-mode-verification.md) |

## What shipped

- Schema: `ClinicianAvailability.{mode,capacity,overbook_allowance,walkin_ratio}`,
  `Appointments.{booking_mode,token_no}`, new `Resources`/`AppointmentResources`
  tables with their own exclusion constraint, the two existing exclusion
  constraints re-scoped to `booking_mode='slot'`.
- Backend: `availability.service.ts`'s `sessionAvailability()` +
  slot-skip for non-slot windows; new `backend/src/resources/` module;
  `appointments.service.ts` and `public.service.ts` (the two independent
  GraphQL dialects) both gained session-mode capacity enforcement
  (`pg_advisory_xact_lock`-guarded count-then-insert, sequential `token_no`)
  and slot-mode multi-resource intersection booking.
- Frontend: new `manager/resources/index.jsx` admin page; mode/capacity
  fields on both availability admin surfaces; the public booking wizard's
  "join this session" card; calendar token-number display.
- Tests: 5 new/updated backend spec files (`availability`, `resources`,
  `appointments`, `public` services), one real regression fix in
  `booking/index.test.jsx` (MockedProvider mocks needed the new query
  fields), one new e2e spec verified passing against the real dev stack.

## What's deliberately not built yet (P1, REQ017's own phase assignment)

Hybrid-mode walk-in interleaving (schema exists, no runtime logic), waitlist
with claim-links, delay broadcast, bulk-reschedule-with-accept, and the
rolling-median `SessionThroughput` live-ETA refinement (needs real
`checked_in→completed` data from `REQ019`/`REQ020`, picked up next in this
pass). Each gets its own future `PLAN###` under `REQ017` when picked up —
not silently dropped.
