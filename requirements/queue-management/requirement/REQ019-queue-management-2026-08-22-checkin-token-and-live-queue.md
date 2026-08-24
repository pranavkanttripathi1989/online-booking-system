---
id: REQ019
type: requirement
feature: queue-management
created: 2026-08-22
updated: 2026-08-24
status: in-progress
parent: REQ017
related: [REQ017, REQ018, REQ042, PLAN058, TP085, TR084]
---

## Status (2026-08-24)

**P0 shipped** (`PLAN058`/`TP085`/`TR084`), on top of `REQ042`'s prior
check-in/status-tracking slice: the live queue board (now-serving, next-5
waiting, a today-only retrospective average wait — `US-QUE-03`), queue
actions (call next, recall a stepped-away or auto-return-pending patient,
skip/park with N-served auto-return, transfer to a colleague — `US-QUE-05`),
and the unbilled-visits report (`US-QUE-07`). A checked-in appointment now
materializes a real `QueueEntries` row (hooked into
`AppointmentsService.transitionStatus()`, not a separate frontend action),
and every open queue-board view updates live over the existing `graphql-ws`
infrastructure — no new real-time transport, per this requirement's own
Data Model Impact note. New `backend/src/queue/` module,
`frontend/src/pages/queue/index.jsx` (staff board) and `display.jsx` (TV
mode).

**P1 still open**, per this requirement's own phase assignment below — not
silently dropped: QR self-service check-in (`US-QUE-02`), a patient-facing
live position/ETA view built on a real rolling-median throughput
(`US-QUE-04` — this P0 slice's "average wait" is deliberately a same-day
retrospective, not that predictive ETA), the mandatory pre-consultation
checklist gating "call next" (`US-QUE-06`), and triage/vitals capture
(`US-QUE-08`). Each gets its own future `PLAN###` when picked up.

**Booked:walk-in token interleaving is not built** — `US-QUE-01`'s
acceptance criterion calls for check-in to respect a configured
booked:walk-in ratio, but `REQ017`'s own `walkin_ratio` column is
schema-only with no runtime logic (explicitly deferred there as
"hybrid-mode interleaving," P1). This slice's check-in (`REQ042`, already
shipped) issues a token from booking-time sequential numbering only; the
interleaving behavior stays blocked on `REQ017`'s own deferred item, not
re-attempted here.

# Check-in, live queue board, and wait-time estimation

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §9 **M6 — Clinic Check-In & Queue Management** (`FR-QUE-01`–`FR-QUE-09`). Cross-referenced against `project-plans/01-codebase-analysis.md` §3.2 and `project-plans/02-findings-register.md` F-18.

## Current state vs. PRD ambition

This module does not exist in any real form today. `frontend/src/pages/waiting-room/index.jsx` is one of the fourteen pages `project-plans` F-18 identified as rendering entirely fabricated data with **no backend at all** — its check-in, journey states (arrived → in-consult → done), and DNA marking are all driven by `mocks/store.js`. There is no `queue` backend module, no live queue board, and no wait-time estimation of any kind.

This is a genuine net-new module, not an extension, and it has a hard dependency the current codebase does not yet satisfy: real-time throughput data. `FR-QUE-05`'s wait-time estimation needs a rolling median consult duration per clinician per service — which only exists once `REQ017`'s session/token mode is live and `REQ020`'s encounter timestamps (`checked_in → in_consultation → completed`) are being recorded for real, not simulated.

## Gap classification

- **Net-new, entirely:** check-in (front-desk, self-service QR, kiosk), token assignment with booked/walk-in interleaving, live queue board (staff + patient-facing + TV display), wait-time estimation, queue actions (call next, recall, skip/park, transfer), triage/vitals step, pre-consultation checklist gating, departure/checkout reconciliation.
- **Extend existing:** the real-time subscription infrastructure already exists and is the right foundation — `appointmentUpdated` (`graphql-ws`, `common/pubsub.module.ts`) is exactly the transport a live queue board needs; this module should add queue-specific subscription events on the same infrastructure rather than build a second real-time system.

## Phase assignment

PRD Phase: **MVP (P0)** for check-in, token assignment, the queue board, and queue actions (`FR-QUE-01`–`03`, `07`, `09`) — the PRD's Q1 roadmap milestone explicitly names "check-in/queue" as required for "10 design-partner clinics running live daily OPD." Wait-time estimation, patient-facing live status, and triage are **V1 GA (P1)**.

## Dependencies

- **Requires:** `REQ017` (session/token mode must exist — a queue with no token concept has nothing to queue); `REQ020` (encounter start/end timestamps feed the throughput calculation).
- **Blocks:** none directly, but delivering this without `REQ017` first would mean building a queue against slot-mode appointments only, which the PRD explicitly says is the wrong model for Indian OPD.

## User stories

### Epic: Check-in

**US-QUE-01** — As front-desk staff, I want to check a patient in with one click when they arrive, so that they enter the queue without a separate registration step for an existing booking.
- PRD refs: FR-QUE-01, FR-QUE-02
- Priority: P0
- Acceptance criteria:
  - Given a `confirmed` appointment, when front desk clicks check-in, then the appointment transitions to `checked_in`, a token is issued respecting the booked:walk-in interleaving ratio configured in `REQ018`, and the patient enters the live queue immediately.

**US-QUE-02** — As a patient arriving at the clinic, I want to self check-in by scanning a QR code, so that I don't need to queue at the front desk just to announce I've arrived.
- PRD refs: FR-QUE-01
- Priority: P1
- Acceptance criteria:
  - Given a QR scan at the facility, when validated (geo or OTP-gated, per the PRD's own qualifier), then check-in completes identically to the front-desk path.

### Epic: Live queue

**US-QUE-03** — As a clinician's assistant, I want a live queue board showing now-serving, the next 5, and average wait, so that the room always knows who's next without shouting names.
- PRD refs: FR-QUE-03
- Priority: P0
- Acceptance criteria:
  - Given the queue changes (call-next, skip, new check-in), when the change is saved, then every open queue-board view updates within 2 seconds via the existing `graphql-ws` subscription transport — matching the PRD's own NFR (`§13`, "queue board update latency < 2 s").
  - A large-type TV/display view exists as a distinct rendering mode of the same data.

**US-QUE-04** — As a patient waiting for my appointment, I want to see my live position ("You are 4th, approx. 25 min") on my phone, so that I don't have to physically wait in the clinic the whole time.
- PRD refs: FR-QUE-04, FR-QUE-05
- Priority: P1
- Acceptance criteria:
  - Given my position in the queue changes, when the underlying queue state updates, then my view reflects it in real time, with an ETA computed from the rolling median consult duration for this clinician/service, not a static number set at booking.

### Epic: Queue actions

**US-QUE-05** — As a clinician, I want to call the next patient, recall a patient who stepped away, skip and auto-return them after N patients, or transfer them to a colleague, so that the queue adapts to real clinic disruptions.
- PRD refs: FR-QUE-07
- Priority: P0
- Acceptance criteria:
  - Given a patient is skipped/parked, when N other patients have been served, then they are automatically re-inserted into the queue at the configured position, without staff needing to remember to bring them back.

**US-QUE-06** — As a Branch Manager, I want a mandatory pre-consultation checklist (consent, vitals, ID) that can block "call next" until complete, so that a clinician never starts a consult missing required information.
- PRD refs: FR-QUE-08
- Priority: P1
- Acceptance criteria:
  - Given a service configured with a mandatory checklist, when a required item is incomplete, then "call next" for that patient is disabled with a clear reason shown to staff.

### Epic: Departure and reconciliation

**US-QUE-07** — As front-desk staff, I want a checkout step that reconciles any pending bill before a patient leaves, and a day-end flag for any visit that left unbilled, so that revenue isn't silently lost.
- PRD refs: FR-QUE-09
- Priority: P0
- Acceptance criteria:
  - Given a `completed` encounter with an outstanding bill, when the patient attempts to leave (or at day-end reconciliation, whichever comes first operationally), then it appears on an explicit "unbilled visits" report rather than disappearing from view.

### Epic: Triage

**US-QUE-08** — As a nurse, I want to capture vitals between check-in and consultation, so that the clinician has them ready without repeating the measurement.
- PRD refs: FR-QUE-06
- Priority: P1
- Acceptance criteria: vitals captured at triage attach to the same encounter `REQ020` creates, visible in the clinician's workspace before they call the patient.

## Data model impact

- New `QueueEntries` table: `id`, `client_org_id`, `branch_id`, `clinician_id`, `appointment_id`, `token_no`, `status` (`waiting|called|in_progress|done|skipped|no_show`), `checked_in_at`, `called_at`.
- New `QueueEvents` table for the audit trail of call/recall/skip/transfer actions, mirroring the existing `AppointmentStatusLogs` pattern already established in `appointments.service.ts`.
- Reuses the existing `PubSub`/`graphql-ws` infrastructure — no new real-time transport needed, only new subscription topics.

## Non-functional notes

This module inherits the PRD's explicit "offline resilience" NFR (`§13`): front desk must be able to continue check-in for ≥15 minutes of connectivity loss and sync on recovery. That is a genuinely new capability class (local-first check-in with sync) not present anywhere in the current frontend architecture, and should be scoped as its own technical spike before implementation planning, not assumed to fall out of the standard Apollo Client setup.

## Open questions

None raised in PRD §19 specific to this module.
