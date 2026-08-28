---
id: BUG034
type: bug
feature: analytics-reporting
created: 2026-08-28
updated: 2026-08-28
status: open
parent: null
related: []
---

# BUG034 — Manager Dashboard renders raw, unrounded floating-point percentages

## Source

Found live during a Chrome-DevTools-driven manager-role QA sweep,
logged in as `manager@medibook.dev`, `/manager/dashboard` ("Analytics
Overview").

## What's wrong, exactly

Confirmed live in the browser — the "Clinician Utilization" and
"Cancellation Rate" KPI cards render:

```
2.9629629629629632%
66.666666666666666%
```

`frontend/src/pages/manager/Dashboard.jsx`:

- Line 337: `value={loading ? '...' : \`${stats.utilization}%\`}`
- Line 344: `value={loading ? '...' : \`${stats.cancellationRate}%\`}`

Neither rounds or formats the number, unlike the other three KPI cards
on the same row (`stats.totalAppointments.toLocaleString()`,
`` `₹${stats.revenue.toLocaleString()}` ``, etc.).

Root cause is two-layered, not frontend-only:
`backend/src/analytics/analytics.service.ts` line 72
(`cancellationRate = (cancelled.length / total) * 100`) and the
`utilization`/`completionRateProxy` calculation nearby never round
either — the raw division result is sent to the frontend as-is. Neither
layer rounds; the simplest, most conventional fix is at the frontend
display boundary, matching how every money value in this codebase is
already formatted only at its own display boundary (`FORM-18`'s own
convention), not stored/transmitted pre-formatted.

## Acceptance criteria

- Both percentages display rounded to a sane precision (e.g. 1–2
  decimal places), matching the visual polish of every other KPI on
  the same row.
- Recommended: apply the same rounding at the shared formatting
  boundary these two values pass through, not ad-hoc per call site, so
  a future page reading the same `getAppointmentStats` fields doesn't
  reintroduce the same raw-float display.
