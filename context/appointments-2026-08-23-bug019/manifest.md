---
id: CTX-appointments-2026-08-23-bug019
type: bug
feature: appointments
created: 2026-08-23
updated: 2026-08-24
status: done
parent: BUG019
related: [REQ018, BUG011, BUG014, BUG020, platform-nfr-2026-08-23-bug018]
---

# appointments — BUG019, realistic volume hides today's appointments (2026-08-23, closed 2026-08-24)

Found while running the full e2e suite against the isolated stack's
2,000-appointment realistic dataset (`platform-nfr-2026-08-23-bug018`) — a
real, previously-undiscoverable defect, since the shared dev stack's ~4
appointments could never have surfaced it. Closed 2026-08-24 by wiring
`date_from`/`date_to` into `/calendar` and `/appointments` (`PLAN054`),
deliberately without touching the shared resolver's default `orderBy`/window
as originally scoped.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG019 | [realistic volume hides today's appointments](../../requirements/appointments/bug/BUG019-appointments-2026-08-23-realistic-volume-hides-todays-appointments.md) |
| implementation-plans | PLAN054 | [wire date-window filtering into /calendar and /appointments](../../implementation-plans/appointments/bug/PLAN054-appointments-2026-08-24-wire-date-window-into-calendar-and-list.md) |
| test-plans | TP081 | [date-window verification](../../test-plans/appointments/bug/TP081-appointments-2026-08-24-date-window-verification.md) |
| test-results | TR080 | [date-window verification results](../../test-results/appointments/bug/TR080-appointments-2026-08-24-date-window-verification.md) |

## What shipped

- `CalendarView.jsx` forwards FullCalendar's `datesSet` visible range via a
  new `onDatesSet` prop.
- `calendar/index.jsx` turns that range into `date_from`/`date_to` on every
  query, replacing the old flat `first: 500` with no date bound.
- `appointments/index.jsx`'s Upcoming/Past/All tabs now set a real default
  date window (previously computed but never reaching the live query) —
  "All" caps its upper bound *at* today rather than into the future, the
  only way to keep today's rows on page 1 under the shared resolver's
  unconditional `desc` ordering at this dataset's real density (~20
  appointments/day).
- 5 new backend unit tests for `date_from`/`date_to` → `where.appointment_time`
  construction, previously untested.
- `calendar.spec.js`'s two assertions re-scoped to a new
  `data-testid="today-schedule-panel"` — realistic daily density means a
  specific appointment can be correctly fetched yet collapsed behind
  FullCalendar's own `dayMaxEvents={3}` "+N more" in the month grid; the
  Today's Schedule sidebar is the untruncated place to check.

## Two follow-on findings, filed separately rather than fixed here

- `BUG020` — `manager-appointments.spec.js`'s "No Show" filter test assumes
  zero real no-show appointments exist for this org; broke once the
  realistic seed's status distribution genuinely included some. Unrelated
  to date-window logic.
- `context/open-questions.md` #15 — the isolated stack's backend containers
  run in UTC with no `TZ` set. Verification happened to fall in the ~5.5-hour
  nightly window after IST midnight where UTC hasn't rolled to the same
  calendar day, so `Anita Sharma`'s seed-time "today" fixture (backend's UTC
  today) landed one day behind the browser's IST "today" — a real, product-
  wide latent issue for an India-only backend, not this bug's scope to
  decide (fix policy: set `TZ=Asia/Kolkata` on containers, vs. keep UTC and
  compute explicitly). `TR080` documents this was proven not to be a code
  defect via direct GraphQL/DB inspection and one live browser pass captured
  before the boundary was crossed mid-session.
