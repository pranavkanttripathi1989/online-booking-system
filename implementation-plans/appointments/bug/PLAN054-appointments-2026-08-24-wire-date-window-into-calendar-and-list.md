---
id: PLAN054
type: bug
feature: appointments
created: 2026-08-24
updated: 2026-08-24
status: done
parent: BUG019
related: [BUG020, TP081, TR080]
---

# PLAN054 — Wire date-window filtering into `/calendar` and `/appointments`

Well-scoped fix against an already-established real contract
(`AppointmentFiltersInput`'s pre-existing `date_from`/`date_to` fields) — no
test-suggestions stage per `REQ013` Phase D.

## Context

`appointments()`'s list resolver (`appointments.service.ts`) already fully
supports `date_from`/`date_to` — the bug was entirely on the frontend: two
pages never sent them, relying instead on a flat page size plus the
resolver's unconditional `orderBy: desc`, which only ever worked by luck at
the shared dev stack's ~4-row scale. Deliberately did not touch the shared
resolver's default ordering/window — that's flagged in `BUG019` itself as
separate, riskier scope touching every other consumer of `appointments()`.

## 1. `CalendarView.jsx` never told its parent what date range was visible

**Approach:** FullCalendar's own `datesSet` callback already fires with the
visible range on every mount/navigation, but `handleDatesSet` only forwarded
`dateInfo.view.type` to `onViewChange`. Added a new optional `onDatesSet`
prop, called alongside the existing one with the full `dateInfo` object — no
change to existing behavior for any current caller that doesn't pass it.

## 2. `calendar/index.jsx` fetched a flat `first: 500` with no date bound

**Approach:** added `dateRange` state (seeded to the current month so the
very first render is already bounded, before FullCalendar's own `datesSet`
fires and corrects it), a `handleVisibleRangeChange` handler wired to the
new `onDatesSet` prop, and merged `date_from`/`date_to` into `buildFilters()`
unconditionally. `first: 500`/ordering/the `todayEvents` sidebar computation
were left untouched — bounding by the visible range (which always contains
"today" for the default view) was sufficient.

## 3. `appointments/index.jsx`'s Upcoming/Past/All tabs never reached the real query

**Approach:** `tabDateFrom`/`tabDateTo` were already computed from `viewTab`
but only consumed by the mock-error-fallback branch, never merged into
`buildFilters()`. Extended `buildFilters()` so a tab-derived default date
window applies whenever the user hasn't manually picked a date (manual
`dateFrom`/`dateTo` always wins — unchanged existing UX, since
`handleTabChange` already resets those to `null` on tab switch):

- "Upcoming" floors at today (`date_from = today`).
- "Past" caps at today (`date_to = today`).
- "All" needed two iterations, both verified live against the isolated
  stack's realistic (~2,000-row, ~20/day) dataset:
  1. First attempt: `date_from = today-30d`, no upper bound. Verification
     showed page 1 still surfaced the *farthest-future* row in an unbounded
     upper window under `desc` ordering — a lower-bound-only window doesn't
     fix "today buried on page 1" at all, it just shrinks the haystack.
  2. Second attempt (the one that shipped): `date_from = today-30d`,
     `date_to = today`. At ~20 rows/day, *any* future extension beyond today
     re-introduces enough rows-between-today-and-the-edge to push today off
     a 20-row page 1 under `desc` ordering — the only way to guarantee
     today sorts first within the window, without changing the shared
     resolver's ordering, is to make today the window's own upper bound.
     This makes "All" mean "current and recent", not "current and
     upcoming" — a true upcoming-inclusive default would need an ascending
     sort option on the resolver, the same out-of-scope change `BUG019`
     already flagged.

## 4. Zero backend test coverage for `date_from`/`date_to` construction

**Approach:** added a `describe('findAll — date_from/date_to filter
(BUG019)')` block to `appointments.service.spec.ts` — five cases covering
`date_from` alone, `date_to` alone, both together, neither (documents no
implicit default window), and the unconditional `orderBy: desc`. This whole
fix's correctness depends on that pre-existing-but-untested backend
behavior working as documented.

## 5. `calendar.spec.js`'s own acceptance assertions needed re-scoping, not the app

**Approach:** verifying against the realistic dataset surfaced that a single
day can hold far more than FullCalendar's `dayMaxEvents={3}`, so a specific
appointment can be correctly *in the fetched data* yet collapsed behind a
"+N more" link in the month grid — present but not "visible" in Playwright's
strict sense. Added `data-testid="today-schedule-panel"` to the existing
Today's Schedule sidebar (the one place on the page already designed to list
a full, untruncated day) and re-scoped both `calendar.spec.js` assertions to
it. Did not change `dayMaxEvents` or add a "click +N more" step — the
sidebar already exists specifically for this, and changing month-grid
density is an unrelated UX call.

## Verification plan

See `TP081`.
