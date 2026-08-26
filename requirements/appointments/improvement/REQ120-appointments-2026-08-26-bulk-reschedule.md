---
id: REQ120
type: improvement
feature: appointments
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ017
related: [PLAN160, TP180, TR180]
---

# REQ120 — Bulk-reschedule a clinician's whole day

## Why this slice

`REQ017`'s own P1 residue list named "bulk-reschedule" alongside delay
broadcast, hybrid interleaving, waitlist, and the ETA refinement —
several of those already closed this batch (`REQ106` waitlist,
`REQ117` ETA, `REQ118` delay broadcast, `REQ119` hybrid interleaving).
This slice closes bulk-reschedule: today, moving a clinician's whole
day (out sick, running the day at a different start time, a room
becoming unavailable) means editing every appointment one at a time
through `updateAppointment`.

## User story

As front-desk/manager staff, when a clinician's entire day needs to
move (e.g. running 2 hours behind, or their whole schedule shifting to
next week), I can shift every one of their scheduled/confirmed
appointments on a given day by the same amount in one action, instead
of editing each appointment individually.

## Acceptance criteria

- **Given** a clinician with N scheduled/confirmed appointments on a
  given day, **when** staff bulk-reschedules by M minutes, **then**
  every one of those N appointments' start time shifts by exactly M
  minutes, preserving their relative spacing.
- **Given** an already-checked-in, completed, cancelled, or no-show
  appointment on that day, **then** it is never touched — only
  `scheduled`/`confirmed` rows are eligible.
- **Given** one appointment in the batch would collide with something
  outside the batch at its new time (the DB's own real EXCLUDE
  constraint), **then** that one row fails and is reported as such —
  the rest of the batch still succeeds. An honest
  `{attempted_count, rescheduled_count, failed_count}` is returned, not
  a single boolean.
- **Given** a cross-org clinician id, **then** the mutation is
  rejected before any appointment is touched.
- **Given** a zero `shift_minutes`, **then** the mutation is rejected
  outright (a real no-op worth an explicit error, not a silent
  success).

## In scope

- `bulkRescheduleAppointments(input)` mutation.
- A "Bulk Reschedule" action on `appointments/index.jsx`'s filter
  toolbar, enabled once a specific clinician is selected in the
  existing clinician filter.

## Deliberately out of scope

- A per-appointment new-time mapping (each row keeps the same relative
  offset from the others — this is a "shift the whole day" tool, not a
  general drag-and-drop rescheduler).
- Patient notification on bulk reschedule — matches `update()`'s own
  existing behavior for a plain single-appointment reschedule (it only
  notifies on cancellation today; not a new gap introduced here).
- Resource/room reassignment during the shift — matches the
  already-accepted room-reassignment-on-reschedule gap
  (`context/open-questions.md` #14).
