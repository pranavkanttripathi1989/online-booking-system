---
id: REQ172
type: improvement
feature: prescriptions
created: 2026-08-31
updated: 2026-08-31
status: done
parent: REQ171
related: [PLAN241, TP261, TR261]
---

# REQ172 — Obstetric LMP / EDD / Gestational Age on the printed Rx

## Why this slice

The reference prescription's vitals line includes LMP (last menstrual
period), EDD (estimated date of delivery), and Gestational Age — the
"Gynae Care" half of "Sunshine Hospital — Ortho & Gynae Care". Confirmed
in scope via `AskUserQuestion` before implementation ("Build it now") over
deferring, since the change is small and fully additive.

## Scope shipped

- `Encounters.lmp_date DateTime?` — the only new column. EDD and
  Gestational Age are never stored; both are always computed at render
  time, matching this codebase's own repeated "store the minimum, derive
  at read time" convention (chronic-registry recall status, immunisation
  due-status).
- `backend/src/prescriptions/obstetric-dates.ts#computeObstetricDates(lmpDate, now)`
  — pure function, Naegele's rule (EDD = LMP + 280 days), gestational age
  in whole weeks + remainder days from elapsed time since LMP. Unit
  tested against hand-derived values from the reference image's own LMP
  date (21-12-2025 → EDD 27-09-2026; 24w0d on 07-Jun-2026; 21w6d on
  23-May-2026), each independently re-derived by hand before trusting the
  test, per this codebase's established discipline for date/timezone
  logic.
- `EncountersService#setEncounterLmpDate(encounterId, lmpDate, user)` — a
  dedicated, narrowly-scoped mutation (not a generic "update encounter"
  endpoint), matching the one-mutation-per-concern convention every other
  encounter-write already follows (`saveEncounterNote`). Same self-scope
  + `locked`-encounter rejection as its siblings.
- `assembleEncounterContext()` reads `lmp_date` and merges the computed
  `edd`/`gestational_age_weeks`/`gestational_age_days` into the print
  payload.
- `EncounterWorkspace.jsx`: a new "LMP Date (obstetric)" date field in the
  Vitals section, wired to the new mutation — left blank by default;
  nothing renders on the printout for a specialty that never touches it.

## Acceptance criteria

- Given a clinician sets an encounter's LMP date, when that encounter's
  prescription is printed, then the vitals line shows LMP, a correctly
  computed EDD, and gestational age in weeks+days.
- Given an encounter has no LMP date set, when its prescription is
  printed, then no LMP/EDD/GA line renders at all.
- Given a caller attempts `setEncounterLmpDate` on an encounter belonging
  to a different clinician, a different org, or one already locked
  (sign-off immutability, `REQ020`), then the mutation is rejected.
