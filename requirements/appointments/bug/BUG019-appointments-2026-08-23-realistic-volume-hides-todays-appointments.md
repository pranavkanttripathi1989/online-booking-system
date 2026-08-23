---
id: BUG019
type: bug
feature: appointments
created: 2026-08-23
updated: 2026-08-23
status: open
parent: REQ018
related: [BUG011, BUG014]
---

# BUG019 — At realistic data volume, today's appointments can fall outside the default list/calendar window

Found while running the full e2e suite against `PLAN043`'s new isolated
stack (2,000 real seeded appointments spanning -30..+60 days), not against
the shared dev stack's ~4 appointments — this is a real defect that only
manifests at volume, exactly the class of bug P1.5 was built to surface (see
`06-execution-plan.md` P1's own rationale: "P0's fixes are correct today and
unverifiable tomorrow").

## Symptom

`calendar.spec.js` and `manager-appointments.spec.js` (3 assertions across
both) expect a fixture appointment for `Anita Sharma`, seeded at "today,
10:00", to be visible on `/calendar` and on the manager appointments "All"
tab. Against the isolated stack's 2,000-row dataset, it is not — the page
renders, loads without error, but the specific row never appears in either
view within the test timeout.

## Root cause

Two things compound:

1. `appointments.service.ts`'s list resolver orders results
   `orderBy: { appointment_time: 'desc' }` with no date-range filter applied
   by default.
2. Both consuming pages fetch a **fixed page size** and never set a date
   window:
   - `frontend/src/pages/calendar/index.jsx`'s `buildFilters()` only ever
     sets `clinician_id`/`clinic_id`/`status` from UI filter state — it
     never reads the calendar's own currently-visible date range into
     `date_from`/`date_to`, despite `AppointmentFiltersInput`
     (`backend/src/appointments/dto/appointment-filters.input.ts`) already
     supporting both fields. The query runs with `first: 500, page: 1` and
     no date bound at all.
   - `manager/appointments/index.jsx`'s "All" tab has the same shape: no
     date filter sent, relying entirely on `desc` ordering plus a page size
     to surface "recent" rows.

At 4 appointments (the shared dev stack), `desc`-ordered + no filter +
generous page size trivially includes everything, so this was never visible.
At 2,000 rows spread across a 91-day window, "today" is buried in the middle
of the `desc`-ordered set — a single appointment seeded for "today" can
easily fall outside whatever page size the frontend requests, even though
the backend has every capability needed to filter for it directly.

**This is not a seed-script bug and was not treated as one.** The backend
already exposes `date_from`/`date_to` on `AppointmentFiltersInput`; the gap
is entirely that these two consuming pages never wire it. Per this session's
own working rule ("if a failure is a real app bug unrelated to seed data,
document it as a new BUG rather than trying to force the seed to work
around it"), no seed-script change was made to route around this —
`Anita Sharma`'s fixture appointment stays exactly where a real "today"
appointment would realistically be scheduled.

## Why not fixed in this pass

`appointments()`'s ordering and default window are shared across every
consumer of the resolver (calendar, manager appointments list, patient
appointments, clinician dashboard, dashboard widgets — not audited
exhaustively here). Changing the resolver's default behavior, or wiring
date-window filtering into two different page's already-distinct UI state
models (a `FullCalendar` visible-range callback vs. a tab-based table with
no date concept at all today), is real, multi-file scope that needs its own
plan and its own regression pass across every other consumer of the same
resolver — not a one-line fix safe to make inside this diagnostic pass.
Filed here instead of silently left undiscovered.

## Suggested direction (not committed to, needs its own plan)

- `calendar/index.jsx`: wire `date_from`/`date_to` from `FullCalendar`'s own
  `datesSet` callback (it already reports the visible range) into
  `buildFilters()`.
- `manager/appointments/index.jsx`: either add an explicit date-range
  control, or default to a `date_from` anchored on "today minus N days" so
  the "All" tab shows current-and-upcoming activity first rather than
  whatever `desc` ordering happens to surface.
- Before changing the resolver's own default `orderBy`/window, check every
  other consumer (dashboard, clinician/patient portals) so a shared-resolver
  change doesn't trade one page's bug for another's.

## Verification

Reproduced live and repeatedly: `calendar.spec.js` (2 of its assertions) and
`manager-appointments.spec.js` (3 assertions) fail consistently against the
isolated stack's realistic-volume dataset, and pass against the shared dev
stack's ~4-row dataset — confirming the volume dependency, not flakiness.
No fix implemented yet; status remains `open`.
