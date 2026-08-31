---
id: TP261
type: improvement
feature: prescriptions
created: 2026-08-31
updated: 2026-08-31
status: done
parent: PLAN241
related: [REQ172, TR261]
---

# TP261 — Test plan: obstetric LMP / EDD / Gestational Age

## Backend unit

- `obstetric-dates.spec.ts`: `computeObstetricDates` matches 3
  hand-derived date pairs from the reference image's own LMP
  (21-12-2025 → EDD 27-09-2026; 24w0d elapsed on 07-Jun-2026; 21w6d
  elapsed on 23-May-2026), plus a same-day-as-LMP zero-elapsed case.
- `encounters.service.spec.ts` (`setEncounterLmpDate`): rejects a locked
  encounter, rejects a cross-org caller, rejects a clinician who doesn't
  own the encounter, succeeds for the owning clinician.
- `prescriptions.service.spec.ts`: `assembleEncounterContext` merges
  `edd`/`gestational_age_weeks`/`gestational_age_days` when `lmp_date` is
  set; omits them when it is not.

## Frontend (`EncounterWorkspace.test.jsx`, `PrescriptionPrint.test.jsx`)

- Setting the LMP date field calls the real `setEncounterLmpDate`
  mutation with the entered value and refetches the encounter.
- The printed Rx shows the LMP/EDD/GA line when `encounter_context.lmp_date`
  is set, and shows nothing when it is not (regression for non-obstetric
  specialties).

## Live verification

- Setting a real encounter's LMP date and printing its prescription shows
  a correctly computed EDD/GA on both preview and PDF; an
  obstetric-untouched encounter shows neither.
