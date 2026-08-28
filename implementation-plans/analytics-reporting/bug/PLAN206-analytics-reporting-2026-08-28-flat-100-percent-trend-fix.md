---
id: PLAN206
type: bug
feature: analytics-reporting
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG035, BUG042]
---

# PLAN206 — Fixing the flat-100%-trend bug class (BUG035, BUG042)

Two independently-implemented instances of the identical defect, fixed
together per `BUG042`'s own writeup.

## Backend

`analytics.service.ts#pctChange` and `dashboard.service.ts`'s own
module-level `pctChange` both changed from `if (!previous) return
current ? 100 : 0` to `if (!previous) return null`. Deliberately kept
as two separate copies rather than extracted into one shared
cross-module helper — the function is 3 lines, and a shared-module
dependency between `analytics` and `dashboard` felt like more real
cost than the duplication; each copy now cross-references the other in
a comment.

GraphQL types made nullable: `AppointmentStatsTrendsType`'s 5 fields
(`analytics.entity.ts`), `DashboardType`'s 4 `*_change` fields
(`dashboard.entity.ts`).

## Frontend

- `StitchKpiCard.jsx` (backs `manager/Dashboard.jsx`): renders no trend
  badge when `trend` is `null`/`undefined` (was `trend !== undefined`
  only, which let `null` through as a fabricated "0%" flat badge); also
  now rounds a real trend to 1 decimal, closing an adjacent unrounded-
  float instance of `BUG034`'s own defect in the same badge.
- `staff/Dashboard.jsx`: `pctLabel` and the inline
  `total_patients_change` formatting both render an empty string on
  `null`, not a coerced "0%".
- `dashboard/index.jsx`'s `KpiCard.jsx`: no change needed — already
  written defensively (`trend != null`), just never received a real
  `null` before.

## Testing

2 existing backend tests that asserted the old fabricated `100`/`0`
values fixed to assert `null` (pinning-the-bug-in-place, per `CLAUDE.md`'s
own standing warning). 1 new backend test
(`dashboard.service.spec.ts`, null-on-no-baseline). 4 new frontend
tests (`StitchKpiCard.test.jsx`). `npx tsc --noEmit` clean, `npx
eslint` 0 new errors.

Live-verified against the real dev stack — see `TR226`.
