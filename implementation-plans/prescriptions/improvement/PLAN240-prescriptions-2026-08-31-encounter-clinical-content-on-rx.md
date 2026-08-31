---
id: PLAN240
type: improvement
feature: prescriptions
created: 2026-08-31
updated: 2026-08-31
status: done
parent: REQ171
related: [TP260, TR260]
---

# PLAN240 — Implementation plan: encounter clinical content on the printed Rx

## Backend

1. `prescriptions.service.ts#assembleEncounterContext(encounterId)`: joins
   `EncounterNotes` (complaints/exam/advice/follow_up/investigations),
   active `Diagnoses` (joined `", "`), and the latest `Vitals` row
   (bp_systolic/diastolic, height_cm, weight_kg), computing
   `bmi = weight_kg / (height_cm/100)^2` at read time. Reuses the exact
   Prisma query shapes `visitSummaryPdf` already runs.
2. `itemsToGraphQL()`: joins `Drugs.composition` per item (column already
   existed, never previously selected).
3. New `PrescriptionEncounterContextType` GraphQL type
   (complaints/exam/diagnosis/advice/follow_up/investigations/
   bp_systolic/bp_diastolic/height_cm/weight_kg/bmi, all nullable);
   `encounter_context` added to `PrescriptionPrintPayloadType`.
4. `common/pdf/i18n-labels.ts`: 9 new en/hi key pairs (`complaints`,
   `exam`, `diagnosis`, `advice`, `followUp`, `vitals`, `bmi`,
   `composition`, `forAppointment`).
5. `documents.service.ts#drawPrescriptionPdf()`: new clinical-content
   section between the patient block and the ℞ table; composition line
   per item; advice/follow_up/investigations block after the table.

## Frontend

`PrescriptionPrint.jsx`: `PRINT_QUERY` extended with `item.composition`
and `encounter_context`; new clinical-content block (complaints/vitals
line/BMI/diagnosis/exam) between the patient bar and the ℞ table, each
line rendered only when its value is non-null; composition line under
each drug's dose/frequency line; advice/follow_up/investigations block
after the table.

## Test-authoring note

`prescriptions.service.spec.ts`'s mock `prisma` object needed
`diagnoses.findMany`, `appointments.findUnique`, `encounterNotes.findMany`,
`vitals.findMany`, `clinicians.findMany` added — none of these Prisma
models were previously touched by this service's own test doubles.
