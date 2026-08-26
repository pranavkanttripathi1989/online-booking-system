---
id: REQ106
type: improvement
feature: scheduling-engine
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ017
related: [PLAN146, TP170, TR170]
---

# REQ106 — Booking waitlist for fully-booked slots

First of REQ017's four deferred P1 items to be picked up (hybrid-mode
interleaving, waitlist, delay broadcast, bulk-reschedule — see
`CLAUDE.md`'s own Phase G account). This slice builds **only** the
waitlist piece.

## Why this slice

`frontend/src/pages/booking/index.jsx:567` already shows "No
availability for this date. Please select another date." when a
clinician/day has no open slots — a real, live dead end today. Nothing
captures that a patient wanted that slot, and nothing notifies anyone
when a cancellation frees it. `appointments.service.ts`'s
`transitionStatus()` already has the exact hook point: its own comment
("REQ017: a cancelled/no_show appointment frees its resources") marks
precisely where a slot becomes available again, and
`notifyLinkedProfile()` is the existing, proven pattern for reaching a
linked account through `NotificationTriggerService.dispatch()` — this
slice reuses both rather than inventing a parallel mechanism.

## User story

As a patient who finds their preferred clinician/day fully booked, I
want to join a waitlist for that specific clinician + date, so that I'm
notified the moment a cancellation frees a slot — without needing to
keep re-checking availability myself.

## Acceptance criteria

1. **Given** a patient viewing a day with zero available slots for a
   clinician, **when** they click "Join Waitlist", **then** a
   `WaitlistEntries` row is created linking their `patient_id` to that
   `clinician_id` + date, and they see a confirmation with their queue
   position.
2. **Given** an appointment for that same clinician/date is cancelled
   or marked no-show, **when** `transitionStatus()` runs, **then** the
   earliest still-active waitlist entry for that clinician/date is
   notified via the existing notification pipeline (a new
   `waitlist_slot_available` event) with a **time-boxed claim window**
   (30 minutes), not an automatic booking.
3. **Given** a notified waitlist entry's claim window expires with no
   booking made, **when** the sweep runs, **then** the entry is marked
   `expired` and the next entry in the queue (if any) is notified.
4. **Given** a patient viewing their own account, **when** they open
   their waitlist entries, **then** they see only their own entries
   (self-scoped), never another patient's.
5. **Given** a manager/admin viewing the waitlist for their org's
   clinics, **when** they query it, **then** they see only entries for
   clinics in their own org (tenant-scoped, no cross-org read).

## Scope

- One waitlist per `(clinician_id, date)` pair — not per exact
  time-slot (a cancelled 10:00am slot and a cancelled 11:00am slot on
  the same day both notify the same day-level waitlist; the patient
  still books their own preferred time once notified).
- Requires an authenticated patient account. **Deliberately NOT
  anonymous** — a waitlist entry needs a durable, linkable identity to
  notify later (`notifyLinkedProfile()`'s pattern requires a real
  `UserProfiles` row), and the public booking wizard's anonymous path
  has no such identity until the booking mutation itself resolves one.
  An anonymous "join waitlist" would need its own separate
  contact-capture flow — out of scope here, logged as a follow-on if
  ever needed.
- Notify-only with a claim window, never auto-booking on promotion —
  the safer of the two designs REQ017's own deferral note left open:
  auto-booking risks double-booking against a concurrent walk-in/token
  slot in hybrid mode (REQ017's own `booking_mode` column exists
  precisely because slot/session/hybrid capacity is enforced
  differently), and silently commits a patient to a time they may no
  longer want.
- One active waitlist entry per patient per clinician/date (prevent
  duplicate joins).

## Deliberately deferred

- Hybrid-mode interleaving, delay broadcast, bulk-reschedule — the
  other three REQ017 P1 items, each its own future slice.
- Anonymous/pre-account waitlist joining.
- A configurable claim-window duration (hardcoded 30 minutes for this
  slice; org-configurable is a real but separate future improvement).
- Multi-clinician "any available clinician" waitlist — this slice is
  single-clinician only, matching how the booking wizard itself already
  scopes by one selected clinician.
