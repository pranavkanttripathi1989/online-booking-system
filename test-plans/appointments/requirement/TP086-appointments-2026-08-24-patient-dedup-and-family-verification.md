---
id: TP086
type: requirement
feature: appointments
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: PLAN059
related: [REQ018, TR085]
---

# TP086 — Verification for patient dedup + merge, and family/dependant profiles

## Suggestion stage

Skipped. `REQ018` already carries full Given/When/Then acceptance criteria
for `US-BOOK-01`/`02`, and `PLAN059` records the two genuine design
decisions (self-scope widened by set membership, not by removal; merge's
FK-remapping scope) with their rationale. This extends the already-proven
`patients`/`appointments` self-scoping pattern rather than exploring a
genuinely new one.

## Per-defect/feature contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | `findPotentialDuplicates` — no name/DOB given | returns exact-phone matches unfiltered |
| TC-02 | `findPotentialDuplicates` — name and/or DOB given | filters to candidates matching name OR DOB |
| TC-03 | `mergePatients` — merging a patient into themself | rejected, `BadRequestException` |
| TC-04 | `mergePatients` | moves every FK reference (`Appointments`, `Encounters`, `Prescriptions`, `TestResults`, `AppointmentPayments`, `Reviews`) from merged to survivor |
| TC-05 | `mergePatients` | remaps `PatientRelations` on both the owner and dependant sides |
| TC-06 | `mergePatients` — survivor has no login | relinks the merged patient's `UserProfiles` login to the survivor |
| TC-07 | `mergePatients` — survivor already has a login | does not relink (leaves the merged login orphaned, a stated edge case) |
| TC-08 | `mergePatients` | soft-deletes the merged patient (never a hard delete), writes a `PatientMerges` audit row |
| TC-09 | `myDependants` — unlinked patient account | returns an empty list |
| TC-10 | `myDependants` | lists only the caller's own dependants |
| TC-11 | `addDependant` — non-patient or unlinked-patient caller | rejected, `ForbiddenException` |
| TC-12 | `addDependant` | creates a new `Patients` row and links it under the caller's own `patient_id` |
| TC-13 | `findAll`/`findOne` — patient caller, no dependants | restricted to exactly their own id |
| TC-14 | `findAll`/`findOne` — patient caller with a dependant | includes the dependant's id alongside their own |
| TC-15 | `findAll`/`findOne` — patient caller, a record that is neither their own nor a dependant's | rejected, `NotFoundException` (not Forbidden — no existence leak) |
| TC-16 | `appointments.create()` — patient caller, `patient_id` neither their own nor a dependant's | rejected — the pre-existing gap this slice found and closed |
| TC-17 | `appointments.create()` — patient caller, a genuine dependant's `patient_id` | allowed |
| TC-18 | `AppointmentsService`'s existing spec suite | unaffected by the new `PatientsService` constructor dependency (mocked) |
| TC-19 | Full backend suite regression | 0 failures |
| TC-20 | Backend lint + `tsc --noEmit` | clean |
| TC-21 | Backend integration suite regression | 0 failures |
| TC-22 | Full frontend suite regression, coverage threshold | 0 failures; global function-coverage floor still met (never lowered) |
| TC-23 | Frontend lint | 0 new warnings from this slice's files |
| TC-24 | Frontend build | succeeds |
| TC-25 | e2e — dedup prompt on `CreatePatientPage`, cancellable | full flow passes against the real dev stack |
| TC-26 | e2e — a manager merges two real patients via the (previously unreachable) UI | mutation fires, snackbar confirms, not the mock simulation |
| TC-27 | e2e — a patient adds a dependant and sees them under My Family | full flow passes against the real dev stack |
