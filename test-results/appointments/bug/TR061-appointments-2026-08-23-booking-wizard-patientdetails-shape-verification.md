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

## Static checks

Single-line change, no new imports, no lint-relevant surface change beyond
the touched lines.

## Commit

Pending (this bundle is written immediately before the commit per the
working loop — see the commit that follows this doc for the SHA).
