---
id: REQ171
type: improvement
feature: prescriptions
created: 2026-08-31
updated: 2026-08-31
status: done
parent: REQ170
related: [PLAN240, TP260, TR260]
---

# REQ171 — Encounter clinical content (complaints/vitals/diagnosis/advice) on the printed Rx

## Why this slice

The reference competitor prescription (HealthPlix EMR) is not just a drug
list — it prints the same visit's complaints, a combined vitals line
(BP/Height/Weight/BMI), physical examination, a bold diagnosis, and an
advice/follow-up section alongside the ℞ table. This codebase already
fully models all of this on `Encounters`/`EncounterNotes`/`Vitals`/
`Diagnoses` (`REQ020`) and already joins it once, inside
`documents.service.ts#visitSummaryPdf` — it was simply never joined into
`prescriptions.service.ts#printPrescription()`'s own payload.

## Scope shipped

- `prescriptions.service.ts#assembleEncounterContext(encounterId)`: joins
  `EncounterNotes` (complaints/exam/advice/follow_up/investigations),
  active `Diagnoses` (joined `", "`), and the latest `Vitals` row
  (bp_systolic/diastolic, height_cm, weight_kg), computing BMI at read
  time. Reuses the exact Prisma query shape `visitSummaryPdf` already
  runs rather than a third divergent copy.
- `itemsToGraphQL()` now joins `Drugs.composition` per item — the schema
  column already existed and was never selected.
- New `PrescriptionEncounterContextType` GraphQL type; `encounter_context`
  added to `PrescriptionPrintPayloadType`, nullable — an encounter with no
  recorded clinical content (or a prescription issued outside an
  encounter) omits the field entirely, not empty strings.
- PDF (`documents.service.ts#drawPrescriptionPdf`) and on-screen preview
  (`PrescriptionPrint.jsx`) both gained a clinical-content block between
  the patient bar and the ℞ table, and a composition line per drug row —
  each line only rendered when its underlying value is non-null.
- New `common/pdf/i18n-labels.ts` keys (`complaints`, `exam`, `diagnosis`,
  `advice`, `followUp`, `vitals`, `bmi`, `composition`, `forAppointment`),
  en/hi, following the existing `REQ160` label-dictionary pattern.

## Deliberately deferred

- Investigation *orders* (as opposed to the free-text `investigations`
  note field, which is included) — that's `REQ020`'s own already-deferred
  P1/P2 scope, not reopened here.
- ICD-10 coding on the printed diagnosis line — same status.

## Acceptance criteria

- Given an encounter has recorded complaints, vitals, a diagnosis, and
  advice, when its prescription is printed, then all four render on both
  the preview and the PDF, with BMI computed correctly from the recorded
  height/weight.
- Given a prescription's item references a combination drug with a
  non-null `composition`, when printed, then the composition line renders
  directly under that drug's name.
- Given an encounter has no recorded clinical content at all, when its
  prescription is printed, then no clinical-content block or composition
  line renders — the drug-only layout from before this slice is
  preserved exactly.
