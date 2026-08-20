---
feature: dashboard
date: 2026-08-21
ids: [REQ007, PLAN014, TP044, TR043]
status: done
---

# dashboard — 2026-08-21

A separate, later bundle from `dashboard-2026-04-02` (pre-backend, mock-era test-plan/test-result only — that bundle predates a real backend existing at all and is left untouched).

Found while live-verifying the app in a browser after this session's Finances-page work (REQ004): `/dashboard` (admin/super_admin/staff, `frontend/src/pages/dashboard/index.jsx`) sends a `DASHBOARD_QUERY` that had **zero backend behind it** — no `dashboard` field existed anywhere in the GraphQL schema, so every load failed schema validation and silently fell back to an inline `MOCK_DASHBOARD` object. This wasn't caught by the earlier mock-removal audit (`context/backend-api-requirements-master-plan.md`) because the fallback data lives inline in the page file, not imported from the shared `mocks/store.js` that audit grepped for — a blind spot in that audit's method.

Built a new `backend/src/dashboard` module (REQ007/PLAN014) aggregating 8 real metrics/charts from `Appointments`, `Clinicians`, `Patients`, `AppointmentPayments`, and `ClinicianAvailability` — today's/week's/month's appointment counts, clinician/patient totals with 30-day change, revenue this month (matching REQ004's finances-page metric, not `analytics.service.ts`'s different one), no-show rate, upcoming appointments, per-clinician utilisation (real but deliberately simplified, matching `analytics.entity.ts`'s own documented utilisation-proxy precedent), 30-day volume, and bookings-by-service. No Prisma schema changes needed.

The e2e investigation (TR043) found and fixed a real test-authoring bug (a redundant `page.goto()` after login was aborting Vite chunk loads) via `page.on('pageerror'/'requestfailed')` instrumentation, and separately documented — rather than hid — a genuine environment limitation: this dev machine's Docker Desktop VM can't reliably run this spec (or likely others) under full 3-worker parallelism given the resource strain already observed all session; `--workers=1` is clean.

## Requirement

- [REQ007 — Admin/Staff Dashboard — real backend data](../../requirements/dashboard/requirement/REQ007-dashboard-2026-08-21-real-admin-dashboard.md) — done, updated 2026-08-21

## Implementation plan

- [PLAN014 — real `dashboard` query](../../implementation-plans/dashboard/requirement/PLAN014-dashboard-2026-08-21-real-admin-dashboard.md) — done

## Test plan

- [TP044 — real `dashboard` query](../../test-plans/dashboard/requirement/TP044-dashboard-2026-08-21-real-admin-dashboard.md) — approved

## Test results

- [TR043 — real `dashboard` query](../../test-results/dashboard/requirement/TR043-dashboard-2026-08-21-real-admin-dashboard.md) — passed
