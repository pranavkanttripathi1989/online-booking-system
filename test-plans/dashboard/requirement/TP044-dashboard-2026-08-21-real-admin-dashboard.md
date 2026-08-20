---
id: TP044
type: requirement
feature: dashboard
created: 2026-08-21
updated: 2026-08-21
status: approved
parent: REQ007
related: [PLAN014]
---

# Test plan — real `dashboard` query (REQ007/PLAN014)

## Unit tests (`backend/src/dashboard/dashboard.service.spec.ts`, 11 cases)

**Tenant isolation**: every `appointments`/`clinicians` count/findMany call scoped by `clinic.client_org_id` for a tenant caller; `AppointmentPayments` scoped by its own `client_org_id` column; no `client_org_id` filter anywhere for an org-less platform caller; a same-shaped row from a different org is never reachable in `upcoming_appointments` (query-level scoping, not a post-filter).

**Happy path**: revenue converts paise→rupees and computes correct month-over-month change; `no_show_rate` computed as `no_show / (completed + no_show)`, `0` when the 30-day window is empty; clinician utilisation computed from real `ClinicianAvailability` (daily recurrence), capped at 100%; falls back to `slots_available = max(slots_booked, 1)` when a clinician has zero matching availability rows; `bookings_by_service` grouped by product name, sorted descending; `upcoming_appointments` start/end datetime correctly derived from `appointment_time` + `duration_minutes`.

## Live verification against the real backend

Full `dashboard` query run as `admin@medibook.dev` via `curl` with a real bearer token — every field returned correctly shaped, real (not fabricated) data: 4 appointments today, 1 clinician, 4 patients, ₹499 revenue this month, 2 upcoming appointments with real patient/clinician/service names, 1 clinician utilisation row (Sarah Mitchell, 1/28 slots ≈ 3.6%), 31 days of `volume_by_day`, 1 `bookings_by_service` entry (GP Consultation × 4).

## Browser e2e (Playwright, `frontend/e2e/dashboard.spec.js`, 3 cases)

Dashboard loads with zero GraphQL/console errors for an admin; KPI cards show real data with the old `MOCK_DASHBOARD` fabricated figures (`1,483`, `$28,750`) and the "some data could not be loaded" banner both absent; upcoming-appointments table and all three charts render without any of the old mock patient names (`John Doe`, `Sarah Miller`, `Mark Johnson`).

## Responsive check

360px/1280px, ad-hoc Playwright check (page layout unchanged, only the data source) — zero horizontal overflow at both.

## Non-goals for this plan

True slot-capacity utilisation (lunch breaks, room/spacer blocks) — matches the exact simplification already documented and justified in `analytics.entity.ts` for its own utilisation proxy, not a new one-off standard.
