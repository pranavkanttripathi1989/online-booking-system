---
id: TR260
type: improvement
feature: prescriptions
created: 2026-08-31
updated: 2026-08-31
status: pass
parent: TP260
related: [REQ171, PLAN240]
---

# TR260 — Results: encounter clinical content on the printed Rx

## Backend

- Covered by the same full-suite run recorded in `TR259`: **135/135
  suites, 2148/2148 tests, green**; integration **9/9 suites, 441/441
  tests, green**; `tsc`/`eslint` clean.
- `prescriptions.service.spec.ts` gained two new describe blocks:
  `printPrescription — encounter clinical context (REQ171/REQ172)` (4
  tests: complaints/exam/diagnosis/advice join, BMI computed from a real
  height/weight pair, null-context regression case, LMP/EDD/GA merge) and
  `itemsToGraphQL — composition join (REQ171)` (1 test).

## Live verification

Introspected `PrescriptionEncounterContext.fields` on the running
container: `advice, bmi, bp_diastolic, bp_systolic, complaints, diagnosis,
edd, exam, follow_up, gestational_age_days, gestational_age_weeks,
height_cm, investigations, lmp_date, weight_kg` — all present and served.

## Frontend

Covered by `PrescriptionPrint.test.jsx`'s **11/11 green** run recorded in
`TR259` — includes the dedicated "renders complaints/vitals/BMI/
diagnosis/advice/follow-up and a drug composition line" case and the
no-config regression case (no clinical-content block or composition line
when the encounter has none).
