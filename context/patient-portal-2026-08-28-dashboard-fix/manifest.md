---
id: CTX-patient-portal-2026-08-28-dashboard-fix
type: bug
feature: patient-portal
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG045, PLAN209, TP229, TR229]
---

# Patient dashboard's guaranteed-invalid query, fixed (2026-08-28)

Seventh and final fix batch from the 2026-08-28 five-role QA sweep —
the highest-severity finding: `/patient/dashboard`'s own query targeted
three fields that don't exist on the real schema
(`getPatientAppointments`/`getNotifications`/`getPatientKpis`),
guaranteeing a `GRAPHQL_VALIDATION_FAILED` 400 on every single request
since the day it shipped. Masked by a mock fallback that, unusually,
did disclose it was showing demo data — but the underlying query had
still never once worked for any real patient.

The identical bug class as the historical `BUG021`
(`clinician/Dashboard.jsx`, fixed 2026-08-25) — apparently never found
on the patient side in that earlier pass.

Rebuilt onto the real, self-scoped `appointments()`/`notifications()`
primitives, mapped into the internal shape the page's own extensive
render code already expected so no JSX needed to change. No backend
KPI aggregate exists for this caller; counts derived client-side from
the real list instead, matching `staff/Dashboard.jsx`'s own precedent
for the identical gap.

Live-verified as `patient@medibook.dev`: no more error banner, no more
fabricated "Dr. Sarah Johnson"/"Dr. Marcus Osei" — the page now shows
the real, honest, self-scoped empty state for this unlinked demo
account.

## Documents

- `requirements/patient-portal/bug/BUG045-*.md` (done)
- `implementation-plans/patient-portal/bug/PLAN209-*.md`
- `test-plans/patient-portal/bug/TP229-*.md`
- `test-results/patient-portal/bug/TR229-*.md`
