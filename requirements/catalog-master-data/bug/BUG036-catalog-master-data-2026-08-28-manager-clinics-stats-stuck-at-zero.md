---
id: BUG036
type: bug
feature: catalog-master-data
created: 2026-08-28
updated: 2026-08-28
status: open
parent: null
related: []
---

# BUG036 — `/manager/clinics`: Rooms/Clinicians/Today's Bookings hardcoded to 0 for every real clinic, even though the real data exists on the same page

## Source

Found live during a Chrome-DevTools-driven manager-role QA sweep,
logged in as `manager@medibook.dev`. The page header reads "3 clinics ·
0 rooms total" and the summary cards show "0 Total Clinicians" / "0
Today's Bookings" — while a direct check of this same page's own
network traffic shows a real `ROOMS_QUERY` response returning 2 real
rooms for "MG Road Clinic" alone, and the org's own real clinician
(Sarah Mitchell) and today's real paid transactions were independently
confirmed on `/manager/dashboard` in the same session.

## What's wrong, exactly

`frontend/src/pages/manager/clinics/index.jsx`, `toCardClinic()`
(lines 112–125):

```js
const toCardClinic = (c) => ({
  ...
  clinicians: 0,
  rooms: 0,
  ...
  todayAppts: 0,
  monthlyAppts: 0,
  ...
})
```

The function's own comment (lines 108–111) explains this was a
deliberate, honest placeholder *at the time it was written* — "Backend/
schema.prisma's Clinics/Rooms models don't yet carry clinician counts...
(those depend on Phase 5 Clinicians and Phase 7 Appointments existing)."
Both of those phases have shipped since (this codebase's own `Clinicians`
and `Appointments` domains are long-built and in daily use throughout
this session) — the comment is now stale, and the zero is no longer
honest, it's just wrong.

The most immediate, avoidable part: this same component already fetches
real room data via `ROOMS_QUERY` (`roomsData?.rooms`, mapped via
`toCardRoom` right below `toCardClinic`) — a real per-clinic room count
is one `roomsData.rooms.filter(r => r.clinic?.id === c.id).length` away,
using data already sitting in this component's own state, not a new
query. Clinician and today's-appointment counts would need their own
new query/field (not already fetched here), but the room count has no
such excuse.

## Acceptance criteria

- The clinic cards' "Rooms" count reflects the real number of rooms for
  that clinic, computed from `roomsData` already fetched on this page.
- "Total Clinicians"/"Today's Bookings" either get wired to real data
  (a new field/query) or, if intentionally deferred again, the code
  comment is updated to say so honestly and current — not left
  claiming a blocker (`Clinicians`/`Appointments` not existing) that
  has been false for a very long time.
