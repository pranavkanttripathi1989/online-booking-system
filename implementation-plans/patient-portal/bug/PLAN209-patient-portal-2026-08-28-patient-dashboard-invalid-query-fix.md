---
id: PLAN209
type: bug
feature: patient-portal
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG045]
---

# PLAN209 — Rebuilding the patient dashboard's guaranteed-invalid query

## Root cause

`GET_PATIENT_DASHBOARD_DATA` targeted `getPatientAppointments`/
`getNotifications`/`getPatientKpis`, none of which exist on the real
schema — a guaranteed `GRAPHQL_VALIDATION_FAILED` on every request,
masked by a mock fallback with a "could not load" banner. The identical
bug class as the historical `BUG021` (`clinician/Dashboard.jsx`),
apparently never found on the patient side in that earlier pass.

## Change

`frontend/src/pages/patient/Dashboard.jsx`:

- Query rebuilt onto `appointments(first: 100)` (the real, JWT-
  self-scoped primitive `clinician/Dashboard.jsx` already uses; confirmed
  it also self-scopes a `'patient'`-role caller correctly) and
  `notifications(first: 5)`.
- The real response is mapped into the internal shape the page's own
  render code already expects (`startTime`, `duration`,
  `clinician.name`/`clinicianType`) — no JSX changes needed.
- No backend KPI aggregate exists for this caller; `total`/`completed`/
  `cancelled`/`upcoming` are derived client-side from the mapped list,
  matching `staff/Dashboard.jsx`'s own precedent for the identical gap.
- "Upcoming Appointments" preview filtered to genuinely future,
  non-cancelled appointments, sorted soonest-first, capped to 5. The
  KPI's own "Upcoming" count is taken from the full list, not the
  capped preview.
- Mock fallback retained, now correctly gated on `realAppointments ==
  null` (a genuine error) instead of firing unconditionally.

## Testing

No existing test file for this page; verified live instead, matching
this session's own established scope for a targeted bug fix. `npx
eslint` clean (0 new errors).

Live-verified as `patient@medibook.dev` — see `TR229`.
