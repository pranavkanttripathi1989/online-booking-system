---
id: TR063
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP064
related: [BUG016, PLAN037]
---

# TR063 — Results for wiring patient/Profile.jsx and auth/forgot-password.jsx

Executed 2026-08-23 against the running dev stack, on `master`.

| Case | Result | Evidence |
|---|---|---|
| TC-01 backend unit suite | **pass** | 52 suites / 665 tests, 65.8s. New: `auth.service.spec.ts` (+3), `patients.service.spec.ts` (+2) |
| TC-02 typecheck/lint | **pass** | `npx tsc --noEmit`: clean. `npx eslint "src/auth/**/*.ts" "src/patients/**/*.ts"`: clean |
| TC-03 `me.patient.id` resolves | **pass** | Linked `patient@medibook.dev` to real patient `f8a33736-...`; login response: `"patient":{"id":"f8a33736-...","full_name":"Test Patient"}` |
| TC-04 self read | **pass** | `patient(id: "f8a33736-...")` returned the real record (first_name/last_name/email/phone/dob/gender/address/notes all populated) |
| TC-05 self update | **pass** | `updatePatient` on own id returned the updated `notes` field; reverted afterward |
| TC-06 cross-patient update rejected | **pass** | `updatePatient` on a different real patient's id (`1628a827-...`) returned `NotFoundException`/"Patient not found" |
| TC-07 forgotPassword | **pass** | `{"data":{"forgotPassword":{"success":true,"message":null}}}` |
| TC-08 frontend checks | **pass** | `eslint .`: 0 errors, 169 warnings. `npx jest --coverage=false`: 6 suites / 63 tests pass. `npm run build`: succeeded, 37.4s |
| TC-09 NotificationTemplates removed | **pass** | 0 matches repo-wide |

## Cleanup performed

Reverted the `Patients.medical_notes` test-write and unlinked
`patient@medibook.dev`'s `patient_id` back to `NULL` immediately after
TC-03–06 — these were ad hoc live-verification calls against the real dev
database, not seeded fixtures.

## Commit

Pending — see the commit immediately following this doc.
