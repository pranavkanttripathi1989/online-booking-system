---
id: TP250
type: requirement
feature: clinical-records
created: 2026-08-30
updated: 2026-08-30
status: approved
parent: PLAN230
related: [REQ167, TR250]
---

# TP250 — Verification for immunisation schedule tracker (P2-11)

## Suggestion stage

Skipped. This mirrors an already-proven pattern (`TestResults`' own
patient-direct-clinical-fact shape, `low-stock-sweep.service.ts`'s own
`@Cron` sweep shape) rather than a genuinely exploratory one — a routine
extension, not a new domain concept.

## Per-defect/feature contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | `immunizationSchedule` | returns only active, non-deleted items, ordered by `due_age_days` |
| TC-02 | `patientImmunizations`/`patientImmunizationStatus` — patient caller, own records | resolves |
| TC-03 | `patientImmunizations`/`patientImmunizationStatus` — patient caller, outside own+dependants | `NotFoundException` |
| TC-04 | `patientImmunizations`/`patientImmunizationStatus` — patient caller, a real dependant | resolves |
| TC-05 | clinician caller who has treated the patient | resolves |
| TC-06 | clinician caller who never treated the patient | `NotFoundException` |
| TC-07 | staff/manager/admin caller, patient has an appointment in-org | resolves |
| TC-08 | staff/manager/admin caller, patient's only appointment is in another org | `NotFoundException` |
| TC-09 | staff/manager/admin caller, patient has no appointments anywhere yet | resolves (nothing to compare against) |
| TC-10 | `patientImmunizationStatus` — administered match via `schedule_item_id` | status `administered` |
| TC-11 | `patientImmunizationStatus` — administered match via vaccine+dose fallback (no `schedule_item_id` link) | status `administered` |
| TC-12 | `patientImmunizationStatus` — no record, due date passed | status `overdue` |
| TC-13 | `patientImmunizationStatus` — no record, due within 30 days | status `due_soon` |
| TC-14 | `patientImmunizationStatus` — no record, due beyond 30 days | status `upcoming` |
| TC-15 | `recordImmunization` — unknown `patient_id` | `BadRequestException` |
| TC-16 | `recordImmunization` — patient in a different org (Hard Rule 6) | `NotFoundException` |
| TC-17 | `recordImmunization` — unknown `schedule_item_id` | `BadRequestException` |
| TC-18 | `recordImmunization` — platform operator, org-less patient | resolves |
| TC-19 | `patientTimeline()` — new immunization branch | includes an `immunization`-typed event with the administered dose |
| TC-20 | reminder sweep — nothing overdue/due-soon | no dispatch |
| TC-21 | reminder sweep — patient has their own linked account | dispatches to the patient's own `UserProfiles.id` |
| TC-22 | reminder sweep — child patient, no login of its own, has a guardian via `PatientRelations` | dispatches to the guardian's own linked account |
| TC-23 | reminder sweep — neither patient nor guardian has a linked account | silent no-op |
| TC-24 | reminder sweep — already reminded within 7 days | skipped |
| TC-25 | reminder sweep — one patient's status computation throws | the rest of the sweep still completes |
| TC-26 | Immunizations tab — no schedule data | real empty state, no fabricated rows |
| TC-27 | Immunizations tab — due/overdue/administered rows | real computed data, correct status chip per row |
| TC-28 | Immunizations tab — Record dose dialog | calls the real `recordImmunization` mutation, refetches `patientImmunizationStatus` |

## Also covers (found live, reported by the user, fixed same session)

| ID | Case | Expected |
|---|---|---|
| TC-29 | Sidebar (any page) | the fixed Drawer panel itself never rounds at its outer corners, regardless of the global `MuiPaper` default |
