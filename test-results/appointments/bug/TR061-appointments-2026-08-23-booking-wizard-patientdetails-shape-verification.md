---
id: TR061
type: bug
feature: appointments
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP062
related: [BUG011, BUG014, PLAN035]
---

# TR061 — Results for the `patientDetails` shape fix

Executed 2026-08-23 against the running dev backend (`medibook_backend`,
real `medibook_db`), on `master`.

## Per-defect contract

| Case | Result | Evidence |
|---|---|---|
| TC-01 pre-fix shape reproduces the reported error | **pass** | `curl` with `patientDetails` including `dateOfBirth: null`, `reason`, `notes` returned three `BAD_USER_INPUT` errors: `Field "dateOfBirth"/"reason"/"notes" is not defined by type "PatientDetailsInput"` — matches the user's pasted report exactly, including that a `null`-valued extra key still triggers the error, not just a populated one |
| TC-02 fixed shape succeeds | **pass** | `curl` with `patientDetails: {firstName, lastName, email, phone}` only, real clinician `8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7`, real linked product `caa89f8e-26bd-4325-9f16-df5dd7eb994e` — returned `{"data":{"bookPatientAppointment":{"id":"92af14bb-c9b6-46c2-af5f-a8aabc8ab786"}}}`, zero errors |
| TC-03 cleanup | **pass** | The verification appointment (`92af14bb-...`) and patient (`verify-fix@medibook.dev`) rows deleted from `medibook_db` immediately after TC-02 |
| TC-04 pre-fix `type` reproduces the reported error | **pass** | `curl` with `type: "in person"`-style invalid value reproduced `BAD_REQUEST`: `type must be one of the following values: in_person, video, home_visit` — matches the user's second pasted report exactly |
| TC-05 fixed `type` succeeds | **pass** | `curl` with `type: "in_person"`, real clinician, real linked product — returned `{"data":{"bookPatientAppointment":{"id":"d69b7a0b-5150-42d7-a49a-5048ac68cb57"}}}`, zero errors |
| TC-06 cleanup | **pass** | The verification appointment (`d69b7a0b-...`) and patient (`verify-fix2@medibook.dev`) rows deleted from `medibook_db` immediately after TC-05 |

## Static checks

Two small, localized changes (`patientDetails` object construction, one
ternary on `type`), no new imports, no lint-relevant surface change beyond
the touched lines.

## Commits

`a038e5b` (defect 1 — `patientDetails` shape), plus a follow-up commit for
defect 2 (`type` value mapping) — see git log for the exact SHA.
