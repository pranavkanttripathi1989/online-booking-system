---
id: BUG035
type: bug
feature: analytics-reporting
created: 2026-08-28
updated: 2026-08-28
status: open
parent: null
related: []
---

# BUG035 — Every Manager Dashboard KPI shows a flat, misleading "100%" trend when the prior period has no data

## Source

Found live during a Chrome-DevTools-driven manager-role QA sweep. All
five KPI cards on `/manager/dashboard` ("Analytics Overview") showed an
identical "↗ 100%" trend badge — Total Appointments, Gross Revenue,
Active Patients, Clinician Utilization, **and** Cancellation Rate all
claiming exactly the same 100% increase simultaneously, which is itself
a strong signal something's wrong (a cancellation rate "increasing
100%" alongside revenue "increasing 100%" is not a real pattern any
clinic would produce).

## What's wrong, exactly

`backend/src/analytics/analytics.service.ts`, lines 84–86:

```ts
private pctChange(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
```

When the prior comparison period has **zero** recorded activity for a
metric (`previous` falsy) — the real, common state for a fresh org or
any period before its first real data — this returns a **hardcoded
`100`** for any nonzero current value, regardless of the real
magnitude. Going from 0 appointments to 12 is not meaningfully "a 100%
increase" (percent change from a zero baseline is mathematically
undefined, not "exactly 100"), and the flat constant makes every metric
converge on the identical, misleading badge the moment historical data
is thin — confirmed live: this dev environment's prior 30-day window
has no data, so all five of `totalAppointments`/`revenue`/
`activePatients`/`utilization`/`cancellationRate` (lines 250–254, the
only call sites of `pctChange`) hit this branch at once.

## Acceptance criteria

- A metric with no prior-period baseline to compare against does not
  render a specific, fabricated percentage — needs a real product
  decision on the right treatment (e.g. no trend badge at all, a "New"
  label, or an explicit "no prior data" state), not a guessed number.
- Whatever the chosen treatment, it must not produce the same numeric
  value for every KPI regardless of their real, independent magnitudes.
