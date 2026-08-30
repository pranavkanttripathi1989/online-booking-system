---
id: CTX-frontend-platform-2026-08-30-bug059
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: null
related: [BUG059, PLAN234, TP254, TR254]
---

# patient/clinician pages — AuthContext login-cache gap, 3 new instances (2026-08-30)

Second slice of the full-repo frontend/backend integration audit
("check all fronend page and fix the backend and fronend intgartionn
gap"), scoped to `frontend/src/pages/patient/` and
`frontend/src/pages/clinician/`.

Found and fixed 3 new instances of the already-documented
`AuthContext.jsx` login-cache bug (`user.patient`/`user.clinician`
undefined on a fresh login): `patient/Profile.jsx` (false "not linked"
message), `clinician/Availability.jsx` (writes rejected by the
backend's own self-scope check), `clinician/Calendar.jsx` (lunch
breaks never rendered, placeholder name shown). All three fixed with a
dedicated network-only re-fetch, mirroring the existing
`clinician/Dashboard.jsx` (`BUG021`) fix for the identical root cause.

All other patient/clinician pages audited (`patient/{Appointments,
Dashboard,Family}.jsx`, `clinician/{EncounterWorkspace,Patients,
PrescriptionBuilder}.jsx`) confirmed clean.

Commit: `67d67f8`. Verification: `eslint` clean, `clinician/
Calendar.test.jsx` (pre-existing) still green, full build succeeded.

See `BUG059`/`PLAN234`/`TP254`/`TR254`.
