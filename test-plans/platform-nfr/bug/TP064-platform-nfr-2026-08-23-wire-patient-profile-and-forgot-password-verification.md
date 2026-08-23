---
id: TP064
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: BUG016
related: [PLAN037, TR063]
---

# TP064 — Verification for wiring patient/Profile.jsx and auth/forgot-password.jsx

## Per-item contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | Backend unit suite (`npx jest --maxWorkers=2`) | 665/665 pass, including 5 new cases (3 `buildAuthUser.patient`, 2 `updatePatient` self-scoping) |
| TC-02 | Backend `tsc --noEmit` and `eslint` on touched files | Clean |
| TC-03 | Live login as the demo patient account temporarily linked to a real `Patients` row | `me.patient.id` resolves to that row |
| TC-04 | Live `patient(id: <own id>)` query as that caller | Returns the real record |
| TC-05 | Live `updatePatient(id: <own id>, ...)` as that caller | Succeeds, real row updated |
| TC-06 | Live `updatePatient(id: <a different real patient's id>, ...)` as the same caller | Rejected with `NotFoundException` |
| TC-07 | Live `forgotPassword` mutation | Returns `{success: true}` |
| TC-08 | Frontend `eslint .`, `npm test`, `npm run build` | Lint: 0 errors, 169 warnings (ratchet lowered from 177 in `package.json`); tests 63/63 pass; build succeeds |
| TC-09 | Repo-wide grep for `NotificationTemplates` | 0 matches |

## How this was checked

TC-01/02 via the backend container's own test/typecheck/lint commands.
TC-03–07 via direct `curl` GraphQL calls against the real running dev
backend, using a demo account temporarily linked to a real patient row
(reverted after, including the test note-field mutation used to prove
TC-05). TC-08 via the frontend's own npm scripts. TC-09 via grep.
