---
id: TP260
type: improvement
feature: prescriptions
created: 2026-08-31
updated: 2026-08-31
status: done
parent: PLAN240
related: [REQ171, TR260]
---

# TP260 — Test plan: encounter clinical content on the printed Rx

## Backend unit (`prescriptions.service.spec.ts`)

- `assembleEncounterContext` returns complaints/exam/diagnosis/advice/
  follow_up/investigations joined from `EncounterNotes`/`Diagnoses`.
- BMI is computed correctly from a recorded height_cm/weight_kg pair.
- `itemsToGraphQL` joins `Drugs.composition` onto each returned item.
- An encounter with no recorded clinical content returns
  `encounter_context: null`/omitted fields, not empty strings — the
  no-content regression case.

## Frontend (`PrescriptionPrint.test.jsx`)

- Renders complaints/vitals/BMI/diagnosis/advice/follow-up and a drug
  composition line when the encounter context is present.
- Renders no clinical-content block or composition line when
  `encounter_context` is null (regression: drug-only layout preserved).

## Live verification

- A real prescription issued against an encounter with recorded
  complaints/vitals/diagnosis renders all sections on both preview and
  PDF; a combination drug's composition line renders under its name.
