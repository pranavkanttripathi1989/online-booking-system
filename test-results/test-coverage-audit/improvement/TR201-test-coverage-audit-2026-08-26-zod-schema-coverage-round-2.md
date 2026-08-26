---
id: TR201
type: improvement
feature: test-coverage-audit
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP201
related: []
---

# TR201 — Test results: zod-schema test coverage, round 2

All 14 `TP201` cases pass.

`npx jest src/pages/admin/Roles.test.jsx
src/pages/clinicians/CreateClinicianPage.test.jsx --maxWorkers=2`:
11/11 tests pass (all new — 5 in `Roles.test.jsx`, 6 in
`CreateClinicianPage.test.jsx`).

`npx eslint src/pages/admin/Roles.test.jsx
src/pages/clinicians/CreateClinicianPage.test.jsx
src/pages/patients/index.jsx`: 0 errors. `patients/index.jsx` carries
18 warnings, all pre-existing hex-color literals unrelated to this
slice's diff — down from 21 before the dead-code deletion (3
`no-unused-vars` warnings removed along with the dead code). Full `npm
run lint`: 1906 problems (0 errors, 1906 warnings), down from 1909.
`npm run build`: succeeds.

No backend change; backend suites unaffected.

## Live verification

Not performed against the real dev stack — no browser tool available
this session. The mocked-Apollo coverage above exercises the real
`roleSchema`/`clinicianSchema` validation rules (including the
`.refine()` locum rule), the real `createRole`/`createClinician`
mutation call shapes, and — for `CreateClinicianPage.jsx` — a real
mutation failure surfacing as an error toast rather than a fake
success.
