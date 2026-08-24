---
id: CTX-queue-management-2026-08-24-req019
type: requirement
feature: queue-management
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ019
related: [REQ017, REQ020, REQ042, PLAN058, TP085, TR084]
---

# queue-management — REQ019 P0 slice: live queue board, actions, unbilled visits (2026-08-24)

Slice 4 of a 6-requirement Phase 1 MVP pass (REQ017 → REQ020 → REQ021 →
**REQ019** → REQ018 → REQ032, dependency order). Builds on `REQ042`
(already shipped 2026-08-23: check-in status tracking and a real
waiting-room queue) rather than duplicating it — this slice is the live
board, queue actions, and unbilled-visits report `REQ042` explicitly left
open.

REQ019 itself splits into P0 (this slice) and P1 (explicitly deferred, per
the requirement's own phase assignment — not silently dropped), plus one
item (`US-QUE-01`'s booked:walk-in interleaving) that stays blocked on
`REQ017`'s own deferred `walkin_ratio` runtime logic, not attempted here.
This bundle covers the P0 slice only; REQ019 stays `in-progress`.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ019 | [check-in, live queue board, and wait-time estimation](../../requirements/queue-management/requirement/REQ019-queue-management-2026-08-22-checkin-token-and-live-queue.md) |
| implementation-plans | PLAN058 | [live queue board, queue actions, and unbilled-visits report (P0 slice)](../../implementation-plans/queue-management/requirement/PLAN058-queue-management-2026-08-24-live-queue-board-and-actions.md) |
| test-plans | TP085 | [verification plan](../../test-plans/queue-management/requirement/TP085-queue-management-2026-08-24-live-queue-board-verification.md) |
| test-results | TR084 | [verification results — pass](../../test-results/queue-management/requirement/TR084-queue-management-2026-08-24-live-queue-board-verification.md) |

## What shipped

- Schema: `QueueEntries` (scoped via `clinic.client_org_id`, matching
  `Appointments`' own precedent — deliberately not `Encounters`' precedent,
  since this is transient runtime state, not a standalone clinical record)
  and `QueueEvents` (append-only audit trail, mirroring
  `AppointmentStatusLogs`).
- Backend: new `backend/src/queue/` module. The key architectural move —
  `QueueService.syncFromAppointmentStatus()` is called *inside*
  `AppointmentsService.transitionStatus()`'s own transaction, so
  `REQ042`'s existing `checkInAppointment`/`startConsultation`/
  `completeAppointment`/`markNoShow` mutations now also drive real queue
  state with zero change to the pages that already call them
  (`waiting-room/index.jsx` needed no edits at all).
- Frontend: new `pages/queue/index.jsx` (staff board: now-serving, waiting
  list, call-next/recall/skip/transfer actions, unbilled-visits panel) and
  `pages/queue/display.jsx` (TV/waiting-room large-type display), plus a
  new "Live Queue" sidebar entry.
- Tests: 33 new backend unit tests (`queue.service.spec.ts`), a new
  tenancy-matrix `queue` domain classification, and a new Playwright e2e
  spec covering the full call-next → skip → transfer → unbilled-visits →
  TV-display flow against the real dev stack.

## Real findings from this slice

1. **A silent module-recompile race** — creating the whole `queue/` module
   plus edits to two other module files in quick succession raced
   `nest start --watch`'s debounce; the app restarted using a stale file
   snapshot with **zero error signal anywhere** (clean `tsc`, clean startup
   log) while the new resolver silently never reached the GraphQL schema.
   Caught only by grepping the generated `schema.gql` for the new type
   names. Not a code defect — a development-process lesson, recorded in
   `PLAN058` so it isn't rediscovered.
2. **A real e2e-spec bug** (found while writing it, not left latent):
   `getByLabel('Transfer to')` substring-matched both a row's icon-button
   tooltip and the transfer dialog's own input. Fixed by scoping to
   `page.getByRole('dialog')`.

## What's deliberately not built yet

P1 per REQ019's own phase assignment: QR self-service check-in
(`US-QUE-02`), a patient-facing live position/ETA view built on a real
rolling-median throughput (`US-QUE-04`), the mandatory pre-consultation
checklist gating call-next (`US-QUE-06`), triage/vitals capture
(`US-QUE-08`). Also not built, and not this slice's responsibility to fix:
`US-QUE-01`'s booked:walk-in token-interleaving ratio, blocked on `REQ017`'s
own deferred `walkin_ratio` runtime logic. Each gets its own future
`PLAN###` under REQ019 when picked up — not silently dropped.
