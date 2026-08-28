---
id: BUG042
type: bug
feature: dashboard
created: 2026-08-28
updated: 2026-08-28
status: open
parent: null
related: [BUG035]
---

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
