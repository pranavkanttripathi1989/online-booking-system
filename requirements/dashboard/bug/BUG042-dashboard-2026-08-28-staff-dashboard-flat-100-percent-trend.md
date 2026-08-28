---
id: BUG042
type: bug
feature: dashboard
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG035]
---

## Resolution (2026-08-28, `PLAN206`)

Fixed identically to `BUG035`: `dashboard.service.ts`'s own `pctChange`
now returns `null` instead of a fabricated `100`/`0`; its 4
`DashboardType` fields made nullable. **Not** extracted into one shared
cross-service helper as this doc's own acceptance criteria suggested —
the function is 3 lines, and adding a shared-module dependency between
`analytics` and `dashboard` (provider injection, an extra export
surface) for a one-line duplicate felt like more real cost than the
duplication itself; both copies now carry a comment cross-referencing
the other so a future fix to one doesn't miss its twin.

Frontend: `staff/Dashboard.jsx`'s own `pctLabel` helper and its inline
`total_patients_change` formatting both updated to render an empty
string when the value is `null`, instead of coercing it to `0` and
showing a fabricated "0% vs yesterday/last month".
`dashboard/index.jsx`'s own `KpiCard` component needed **no** change —
it was already written defensively (`trend != null`), just never
actually received a real `null` before now.

1 new backend test (`dashboard.service.spec.ts`, asserting `null` on no
prior-period revenue). Live-verified as `admin@medibook.dev`:
`/staff/dashboard`'s "Today's Appointments" and "Total Patients" cards
now show no sub-label at all, not "+100% vs yesterday"/"100% vs last
month". See `TR226`.

# BUG042 — Staff/Admin Dashboard KPIs show a flat, misleading "100%" trend when the prior period has no data

## Source

Found live during a Chrome-DevTools-driven staff-role QA sweep, logged
in as `receptionist@medibook.dev`. `/staff/dashboard`'s "Today's
Appointments" card read "103 · +100% vs yesterday" and "Total Patients"
read "137 · 100% vs last month" — both trend badges are fabricated, not
computed from a real prior-period comparison.

## What's wrong, exactly

This is the identical bug class already logged as `BUG035`
(`/manager/dashboard`'s `analytics.service.ts#pctChange`), but a
**separate, independently-implemented instance** in a different file —
`backend/src/dashboard/dashboard.service.ts` lines 18–21:

```ts
const pctChange = (current: number, previous: number) => {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
};
```

Four call sites (lines 177, 181, 183, 185) all hit this same
zero-baseline branch whenever the prior comparison period has no
recorded activity — the common state for `total_appointments_today_
change` (compares to yesterday), `total_clinicians_change`,
`total_patients_change`, and `total_revenue_month_change`. This backs
**two** consuming pages, not one: `frontend/src/pages/dashboard/
index.jsx` and `frontend/src/pages/staff/Dashboard.jsx` — so this is a
second, distinct occurrence of the exact bug `BUG035` already flagged in
`analytics.service.ts`, not a duplicate of it. Two near-identical
`pctChange` helpers now exist in this codebase, in two different
services, both with the same defect.

## Acceptance criteria

- Same as `BUG035`: a metric with no prior-period baseline does not
  render a specific, fabricated percentage.
- Given `analytics.service.ts` and `dashboard.service.ts` now
  independently duplicate the identical broken helper, consider
  extracting one shared, correctly-implemented `pctChange` when this
  and `BUG035` are picked up together, rather than fixing the same
  logic twice in parallel.
