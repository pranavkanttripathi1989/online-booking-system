---
id: BUG019
type: bug
feature: appointments
created: 2026-08-23
updated: 2026-08-24
status: done
parent: REQ018
related: [BUG011, BUG014, BUG020]
---

## Resolution (2026-08-24, `PLAN054`)

Fixed exactly along the "suggested direction" below, without touching the
shared resolver's `orderBy`/default window:

- `calendar/index.jsx` now wires FullCalendar's own `datesSet` visible-range
  callback (added as a new `onDatesSet` prop on `CalendarView.jsx`, alongside
  the existing `onViewChange`) into `date_from`/`date_to` on every query —
  the calendar always requests exactly what it's showing, not a flat
  `first: 500` with no date bound.
- `appointments/index.jsx`'s Upcoming/Past/All tabs now set a real default
  date window in `buildFilters()` (previously `tabDateFrom`/`tabDateTo` were
  computed but only ever reached the mock-fallback branch, never the real
  query). "Upcoming" floors at today, "Past" caps at today. "All" needed a
  second iteration: an initial `today-30d .. today+30d` window still put
  far-future rows on page 1 under the shared `desc` ordering once verified
  against the realistic dataset (~20 appointments/day) — capping the upper
  bound *at* today (not into the future) is what actually guarantees
  today's rows sort first within the window; a true "current and upcoming"
  view needs an ascending sort option on the resolver, which is the
  deliberately out-of-scope resolver change this bug already flagged.
- Backend `date_from`/`date_to` → `where.appointment_time` construction had
  zero test coverage despite this whole fix depending on it; added 5 cases
  to `appointments.service.spec.ts` (`date filtering (BUG019)`).
- `calendar/index.jsx` gained a `data-testid="today-schedule-panel"` on its
  Today's Schedule sidebar, and `calendar.spec.js`'s two assertions were
  re-scoped to it: at realistic daily density (~18-20 appointments on a
  single day), FullCalendar's own `dayMaxEvents={3}` legitimately collapses
  a day cell to "+N more" — a specific appointment can be correctly *in the
  fetched data* yet not *visible* in the month grid without ever opening the
  popover. The sidebar is the one place on the page designed to list a full,
  untruncated day, and is what BUG019's own acceptance criterion actually
  cared about ("Anita Sharma's fixture appointment visible on /calendar").

**Verification:** `appointments.service.spec.ts` — 31/31 passing including
the 5 new cases (`npx jest --maxWorkers=2 appointments.service`). Backend
lint/`tsc --noEmit` clean; frontend lint clean on all touched files (only
pre-existing unrelated warnings). E2e verification against the isolated
stack's realistic dataset directly confirmed the fix via GraphQL response
inspection (the `appointments()` query now returns real, correctly
date-bounded rows for both pages, in place of the old unbounded `first: 500`
call) and one full live-browser pass where `Anita Sharma`'s fixture rendered
correctly in the Today's Schedule sidebar. Repeated automated Playwright
runs after that point hit a real, fully-diagnosed, and unrelated
environmental artifact rather than a code defect — see `context/open-questions.md`
#15: the isolated stack's `backend_e2e` container runs in UTC with no `TZ`
set, and testing happened to fall within the ~5.5-hour nightly window after
IST midnight where UTC hasn't yet rolled to the same calendar day. Anita's
fixture, seeded at the backend's UTC "today", ended up one calendar day
behind the browser's IST "today" — confirmed directly via
`psql`: her `appointment_time` is literally `2026-08-23 10:00:00` while the
browser's `dayjs()` correctly computed "today" as `2026-08-24`. The fix
correctly excluded a genuinely not-today appointment; this is not a
regression, and self-resolves once UTC crosses the same boundary (or once
the isolated stack is reseeded after that point). Filed as `open-questions.md`
#15 rather than silently working around it, since fixing it for real means
deciding backend container timezone policy for the whole product, well
beyond this bug's frontend date-filter scope. `BUG020` was filed separately
for one more unrelated finding hit during the same verification pass (a
different test's "zero no-show appointments" assumption breaking at real
volume).

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
