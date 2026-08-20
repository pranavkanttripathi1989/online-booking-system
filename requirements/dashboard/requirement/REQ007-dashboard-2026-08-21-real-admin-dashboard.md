---
id: REQ007
type: requirement
feature: dashboard
created: 2026-08-21
updated: 2026-08-21
status: done
parent: null
related: [PLAN014, TP044, TR043]
---

# Admin/Staff Dashboard — real backend data

**Why this exists:** `frontend/src/pages/dashboard/index.jsx` (route `/dashboard`, shared by `admin`/`super_admin`/`staff`) sends a `DASHBOARD_QUERY` (`query Dashboard { dashboard { ... } }`) that has never had a backend behind it — no `dashboard` field exists anywhere in the GraphQL schema. Every load fails GraphQL validation (`Cannot query field "dashboard" on type "Query"`) and the page silently falls back to an inline `MOCK_DASHBOARD` object. This wasn't caught by the earlier mock-removal audit (`context/backend-api-requirements-master-plan.md`) because the fallback data lives inline in the page file, not imported from the shared `mocks/store.js` that audit grepped for — a blind spot in that audit's method, not a previously-known gap.

Found while live-verifying the app in a browser after this session's Finances-page work (REQ004) — the Dashboard's "some data could not be loaded" banner and a console 400 on `/graphql` pointed straight at it.

## Scope

### In scope — a real `dashboard` query returning:
1. **Today's appointment count + day-over-day change**, org-scoped.
2. **This week's / this month's appointment counts** (requested by the frontend query even though not currently rendered in the UI — must exist to avoid re-breaking schema validation, same failure mode as the bug this closes).
3. **Total active clinicians + 30-day change**, **total patients + 30-day change** (via the existing `Patients` org-scope-through-appointments pattern, `patients.service.ts`).
4. **Revenue this month + change**, defined identically to `finances/index.jsx`'s already-shipped metric (REQ004) — real captured Razorpay payments via `AppointmentPayments`, not "billable value of completed appointments" (the *different* revenue definition `analytics.service.ts` already uses for `manager/Dashboard.jsx` — the two pages must not silently disagree on what "revenue" means).
5. **No-show rate** over the last 30 days.
6. **Upcoming appointments** (next 5, patient/clinician/service names).
7. **Per-clinician utilisation** (last 7 days) — booked appointment count vs. available slot count derived from real `ClinicianAvailability` rows (daily/weekly recurrence only; monthly/custom recurrence and lunch-break/block exclusion are out of scope for this slice, matching the exact same simplification `analytics.entity.ts` already documents for its own utilisation proxy — see that file's comment).
8. **30-day appointment volume** (confirmed/cancelled per day) and **bookings by service** (count per service), both org-scoped.

### Explicitly out of scope
- Real slot-capacity math including lunch breaks and room/spacer blocks — matches the precedent already set and documented in `analytics.entity.ts`.
- Any change to `manager/Dashboard.jsx`'s existing `getAppointmentStats`/`getClinics` (different page, different dialect, already real — untouched).

## Constraints (from CLAUDE.md)

- Multi-tenancy: org-scoped via `req.user.client_org_id`, never a client-supplied argument (hard rule 6). `admin`/`super_admin` (`client_org_id: null`) see platform-wide totals, matching every other domain's established default.
- Role-gated to exactly `admin`, `super_admin`, `staff` — the same three roles `App.jsx`'s `RoleGuard` already restricts the `/dashboard` route to (`manager`/`clinician`/`patient` have their own dedicated dashboards and queries).
- Money as paise in the DB, converted to rupees only at the resolver boundary (hard rule 9).
- Match the frontend's existing field names verbatim (hard rule 7) — `DASHBOARD_QUERY` in `frontend/src/graphql/queries.js` is the fixed contract; this requirement implements against it, not a redesigned shape.

## Acceptance criteria

- `/dashboard` loads with zero GraphQL errors and zero console errors for `admin`/`super_admin`/`staff` roles.
- Every KPI/chart the page actually renders (today's appointments, clinicians, patients, revenue, volume chart, service pie chart, utilisation chart, upcoming appointments table) shows real data, not `MOCK_DASHBOARD`.
- Cross-tenant isolation: an admin/staff account from org A never sees org B's counts — explicit rejection test per hard rule 6.
- Responsive at 360/768/1280px (page was already built and styled; this only wires real data, so a spot-check is sufficient, not a full sweep).
