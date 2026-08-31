---
id: PLAN241
type: improvement
feature: prescriptions
created: 2026-08-31
updated: 2026-08-31
status: done
parent: REQ172
related: [TP261, TR261]
---

# PLAN241 — Implementation plan: obstetric LMP / EDD / Gestational Age

## Backend

1. `Encounters.lmp_date DateTime?` — the only stored column.
2. `backend/src/prescriptions/obstetric-dates.ts#computeObstetricDates(lmpDate, now)`
   — pure function: `edd = lmpDate + 280 days` (Naegele's rule);
   `elapsedDays = floor((now - lmpDate) / MS_PER_DAY)`;
   `gestational_age_weeks = floor(elapsedDays / 7)`,
   `gestational_age_days = elapsedDays % 7`. Never called with a negative
   elapsed span (clamped to 0).
3. `EncountersService#setEncounterLmpDate(encounterId, lmpDate, user)` —
   same `loadEncounterForUser` self-scope + `locked`-encounter rejection
   pattern as `saveEncounterNote`; `EncountersResolver` gates it
   `@Auth('clinician')`, argument type `String!` (matching
   `patients.resolver.ts`'s own plain-string date convention, not
   `DateTime!`).
4. `assembleEncounterContext()` reads `lmp_date` and merges the computed
   `edd`/`gestational_age_weeks`/`gestational_age_days` into the returned
   context — never stored.

## Frontend

`EncounterWorkspace.jsx`: `ENCOUNTER_QUERY` gained `lmp_date`; new
`SET_ENCOUNTER_LMP_DATE` mutation (exported, per this file's own BUG062
precedent of exporting real queries for test reuse); a plain `<TextField
type="date">` in the Vitals section (not folded into the numeric Record
Vitals dialog — `recordVitals`'s `{code, value: Number}` shape doesn't fit
a date), wired via `handleSetLmpDate`.

## Verification math (hand-derived before trusting the unit test)

Using the reference image's own LMP `21-12-2025`:

- EDD = 21-12-2025 + 280 days = **27-09-2026**.
- On `07-Jun-2026`: elapsed = 168 days → 24w0d.
- On `23-May-2026`: elapsed = 153 days → 21w6d.

Both independently re-derived by hand (day-counting across month
boundaries, not a calculator library) before the corresponding
`obstetric-dates.spec.ts` assertions were written, per this codebase's
established discipline for date/timezone logic.
