---
id: REQ017
type: requirement
feature: scheduling-engine
created: 2026-08-22
updated: 2026-08-24
status: in-progress
parent: null
related: [REQ014, PLAN055, TP082, TR081]
---

## Status (2026-08-24)

**P0 shipped** (`PLAN055`/`TP082`/`TR081`): session/token mode alongside
existing slot mode, multi-resource intersection booking (US-CAL-05), the
slot-integrity DB exclusion constraints re-scoped to be mode-aware
(US-CAL-09), sequential token numbering, and a simple booked-count-based
wait estimate (the simple half of US-CAL-01/02/03).

**P1 still open**, per this requirement's own phase assignment below —
not silently dropped, each needs its own future `PLAN###`: hybrid-mode
walk-in interleaving (US-CAL-04, schema-only so far — `walkin_ratio` exists,
no runtime logic), waitlist with claim-links (US-CAL-06), delay broadcast
(US-CAL-07), bulk-reschedule-with-accept (US-CAL-08), and the rolling-median
`SessionThroughput` live-ETA refinement (needs `REQ019`/`REQ020`'s real
`checked_in→completed` data to mean anything — those are picked up next in
the current Phase 1 pass).

# Dual-mode scheduling: session/token mode, multi-resource booking, and slot-integrity

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §9 **M4 — Provider Profiles, Availability & Calendar Engine** (`FR-CAL-01`–`FR-CAL-16`), explicitly flagged by the PRD as *"the heart of the product. Failure here is unrecoverable."* Cross-referenced against `backend/src/availability`, `CLAUDE.md`, and `project-plans/analysis/02-findings-register.md` F-16.

## Current state vs. PRD ambition

This is the single largest gap between the current build and the PRD, and it is a **product-model gap, not a bug** — the existing engine is correctly built for a different assumption than the PRD requires.

What exists today (`backend/src/availability`, 327 lines, 12 tests): recurring weekly `ClinicianAvailability` templates, date-specific overrides (`LunchBreaks`, blocks), slot generation respecting duration/buffer, and a real `assertClinicianAccess()` self-scoping pattern. This is a well-built **slot-mode-only** engine. It assumes every appointment is a fixed-duration grid slot.

The PRD's §2.3.1 states plainly: *"Most Indian OPD runs on sessions... with token numbers, not fixed slots. Any product that forces a Western slot model gets abandoned at the front desk."* Three of the sixteen `FR-CAL` requirements describe a mode that does not exist in the schema at all:

1. **No session/token mode.** `FR-CAL-01`–`04` describe a capacity-based session (e.g., "6–9 PM, 40 tokens") where patients get a token number and a computed ETA from live throughput, not a specific time slot. `ClinicianAvailability` has no `mode` column and no capacity/token concept.
2. **No hybrid mode** (a reserved pre-booked band plus a walk-in token pool) — depends on session mode existing first.
3. **No overbooking policy** (`FR-CAL-06`) — the current engine has no "allow N over capacity" concept; it either has a free slot or it doesn't.

Two further gaps that are genuinely new capability, not mode-dependent:

4. **No true multi-resource intersection booking** (`FR-CAL-05`). Availability today checks the clinician's own calendar; it does not yet check a required `Room`/`Resource` (from `REQ014`) is *also* free, and prevent double-booking of *any* of the required resources — the PRD's own acceptance example (Dr. A + Room 2 + ECG machine) is not satisfiable today.
5. **No delay broadcast, bulk-reschedule, or waitlist** (`FR-CAL-10`–`12`) — these depend on session/token mode's "live throughput" concept and don't fit cleanly onto pure slot mode.

Finally, and independently of scheduling mode: `project-plans` F-16 already found that even the existing slot-mode double-booking check is enforced only in application code (a `findFirst` inside a `READ COMMITTED` transaction), with no database constraint. **This requirement inherits that finding rather than duplicating it** — the fix (a `btree_gist` exclusion constraint) must be built once, correctly, to cover both slot mode and the new session/token mode's resource-conflict checks.

## Gap classification

- **Extend existing:** the existing `AvailabilityTemplate`/`AvailabilityException` model gains a `mode` discriminator and mode-specific fields, rather than being replaced — slot mode's existing tests and self-scoping logic (`assertClinicianAccess`) must keep passing unchanged.
- **Net-new:** session/token mode end-to-end (capacity, token issuance, throughput-based ETA); hybrid mode; overbooking policy; multi-resource intersection booking; delay broadcast; bulk-reschedule; waitlist; database-level slot-conflict constraint (this last item is a shared fix with `project-plans` F-16, not a duplicate).
- **Already satisfied:** slot-mode generation, recurring weekly templates, date overrides, lunch breaks, per-clinician self-scoped write access.

## Phase assignment

PRD Phase: **MVP (P0)** for session/token mode itself (`FR-CAL-01`–`06`, `08`, `09`, `16`) — the PRD treats this as blocking, not a later enhancement, and Q1 of the PRD's own roadmap (§18) names "the calendar engine" as an MVP exit criterion. Delay broadcast, bulk-reschedule, waitlist, recurring series, and calendar sync are **V1 GA (P1)**. Visiting-consultant cross-org conflict warnings are **P1**.

## Dependencies

- **Requires:** `REQ014`'s `Resource` entity (multi-resource booking has nothing to intersect against without it); `project-plans` F-16's database exclusion constraint should be designed once to cover both modes, not twice.
- **Blocks:** `REQ018` (booking engine) cannot offer session/token booking at all until this exists; `REQ019` (queue management) depends entirely on token issuance and live-throughput ETA existing here first — building queue management before this would mean building it against slot mode only and re-doing it.

## User stories

### Epic: Session/token mode

**US-CAL-01** — As a Branch Manager, I want to configure a clinician's evening OPD as a session (6–9 PM, 40 tokens) rather than fixed slots, so that the schedule matches how the clinic actually runs.
- PRD refs: FR-CAL-01, FR-CAL-02
- Priority: P0
- Acceptance criteria:
  - Given a session window with capacity 40, when a patient books, then they receive a token number, not a specific time, and the booking page shows an estimated time computed from the session's live throughput rather than a fixed slot grid.
  - Given the session's capacity is reached, when a 41st patient attempts to book, then the system either offers the waitlist (`REQ017` US-CAL-06) or the walk-in overflow path, per the org's configured overbooking policy — never a silent failure.

**US-CAL-02** — As a patient, I want my estimated appointment time in session mode to update as the clinic actually runs ahead or behind, so that I know when to actually leave home.
- PRD refs: FR-CAL-01
- Priority: P0
- Acceptance criteria:
  - Given a rolling median consult duration for this clinician (computed from actual `checked_in → completed` timestamps once `REQ019`/`REQ020` exist), when 5 tokens ahead of mine are called, then my displayed ETA recalculates, not a static estimate set at booking time.

**US-CAL-03** — As a Branch Manager, I want to allow a configurable number of overbookings per session, visually flagged, so that I can accommodate urgent walk-ins without breaking the schedule silently.
- PRD refs: FR-CAL-06
- Priority: P0
- Acceptance criteria:
  - Given a session at capacity with an overbooking allowance of 3, when a 4th over-capacity booking is attempted, then it is refused with a clear reason, while the first 3 over-capacity bookings succeed and are visually distinguished on every calendar view that shows this session.

### Epic: Hybrid mode

**US-CAL-04** — As a clinician who takes both scheduled patients and walk-ins in the same evening, I want a reserved band of pre-booked slots plus a separate walk-in token pool, so that neither group crowds out the other.
- PRD refs: hybrid mode, §9 M4 intro
- Priority: P1
- Acceptance criteria:
  - Given a hybrid session with a 3:1 booked-to-walk-in interleaving ratio, when the queue is built at check-in time, then walk-ins are interleaved at that ratio, not simply appended after all booked patients (this interleaving logic is shared with `REQ019` FR-QUE-02 — build it once, in the scheduling engine's queue-ordering function, and have queue management call it rather than reimplementing it).

### Epic: Multi-resource booking

**US-CAL-05** — As the booking engine, I want to book the intersection of every resource an appointment requires (clinician + room + equipment), so that no resource is ever double-booked.
- PRD refs: FR-CAL-05
- Priority: P0
- Acceptance criteria (PRD's own acceptance example, restated as the test): Given Dr. A requires Room 2 and the ECG machine for service "TMT," when Room 2 is booked at 11:00, then the 11:00 TMT slot must not be offered even though Dr. A is personally free.
  - Given the same scenario but the ECG machine (not the room) is what's booked elsewhere, then the same refusal applies — the check must cover every required resource, not just the room.

### Epic: Waitlist and disruption handling

**US-CAL-06** — As a patient who wants a fully-booked session, I want to join a waitlist and be automatically offered a released slot, so that I don't have to keep checking back manually.
- PRD refs: FR-CAL-12
- Priority: P1
- Acceptance criteria:
  - Given a cancellation frees a slot, when the waitlist has entries, then the first waitlisted patient receives a time-limited claim link (e.g., 15 minutes); if unclaimed, the offer passes to the next patient automatically.

**US-CAL-07** — As front-desk staff, I want to enter a delay (e.g., +30 min) when a clinician's session runs late and have every affected upcoming patient notified automatically, so that I'm not calling forty people one by one.
- PRD refs: FR-CAL-10
- Priority: P1
- Acceptance criteria:
  - Given a delay is entered, when saved, then every patient with a `confirmed` or `checked_in` appointment in that session receives a notification (via the channel priority already established in `REQ024`/`REQ025`) with the revised ETA, within the same request cycle — not a batch job that runs minutes later.

**US-CAL-08** — As front-desk staff, when a doctor cancels an entire session, I want the system to propose alternatives and let every affected patient accept with one click, so that a single cancellation doesn't become forty individual phone calls.
- PRD refs: FR-CAL-11
- Priority: P1
- Acceptance criteria:
  - Given a session cancellation with alternatives proposed, when a patient clicks the accept link, then their appointment is rescheduled to the chosen alternative without staff intervention, and the original appointment is marked `rescheduled` with a link to the new one (matching the state machine in `PRD §14.3`).

### Epic: Slot-integrity (shared with project-plans F-16)

**US-CAL-09** — As the system, I want it to be impossible — not just unlikely — for two concurrent bookings to double-book the same clinician, room, or resource, so that a race condition can never create two patients for one slot.
- PRD refs: §14.2 "Critical constraints" — unique index on `(clinician_id, start)` and `(room_id, start)`
- Priority: P0
- Acceptance criteria:
  - Given N concurrent booking requests for the same clinician+time (or the same room, or the same resource), when they race, then exactly one succeeds and the rest receive a clean "no longer available" error — enforced by a database exclusion constraint (`btree_gist` on `(resource_id, tstzrange(start, end))`, excluding cancelled rows), not solely by an application-level check.
  - This closes `project-plans` F-16 and its own booking-concurrency test (`project-plans/06` P1 item 1.4) as the same piece of work — do not fix it twice.

## Data model impact

- `ClinicianAvailability`/`AvailabilityTemplate` gains `mode` (`slot|session|hybrid`), `capacity` (nullable, session/hybrid only), `overbook_allowance`.
- New `SessionThroughput` materialized view or rolling-aggregate table: median consult duration per clinician per service, recomputed on every `completed` transition, feeding the live-ETA calculation.
- `Appointment` gains `token_no` (nullable, session/hybrid mode) and `resource_ids[]` (join table `AppointmentResources`) for the multi-resource intersection check.
- New `Waitlist` table: `id`, `client_org_id`, `session_id`, `patient_id`, `joined_at`, `offered_at`, `claim_expires_at`, `status`.
- Database exclusion constraint on `(resource_id, tstzrange(start,end)) WHERE status NOT IN ('cancelled')`, requiring the `btree_gist` extension — one migration, shared with `project-plans` F-16's remediation.

## Non-functional notes

Live ETA recalculation and delay broadcast both need to be fast and correct under the exact load pattern `PRD §13` names as peak (9–11 AM and 6–9 PM IST) — this is precisely the traffic shape that makes `project-plans` F-13 (zero database indexes) most dangerous. Do not ship session/token mode against an unindexed `Appointments` table; the index migration from `project-plans` P0 item 0.4 is a hard prerequisite, not a parallel workstream.

## Open questions

- None raised in PRD §19 specific to this module — the PRD treats the scheduling model itself as settled product direction, not an open question. If overbooking-allowance defaults or waitlist claim-window length need a business decision, log them in `context/open-questions.md` when this requirement enters planning.
