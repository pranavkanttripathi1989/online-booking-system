---
id: TP190
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN170
related: []
---

# TP190 — Test plan: discrete vitals and growth chart

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Locked encounter rejected | `recordVitals` on a locked encounter | `BadRequestException`; `vitals.createMany` never called |
| 2 | Batch create, server-derived unit | Record `weight_kg`+`height_cm` in one call | One `createMany` call, `unit` in each row matches `VITAL_UNITS[code]`, never client-supplied |
| 3 | Returns every reading after create | `recordVitals` | Result matches `vitals.findMany` for the encounter |
| 4 | `patientVitals` rejects a different patient | Cross-patient caller | `NotFoundException` |
| 5 | `patientVitals` rejects an untreating clinician | No matching appointment | `NotFoundException` |
| 6 | `patientVitals` returns one code, chronological | Two readings, same code | `where: {code, encounter: {patient_id}}`, `orderBy: {recorded_at: 'asc'}` |
| 7 | Frontend renders real vitals as chips | `EncounterWorkspace` with recorded vitals | `"Weight: 25 kg"`-style chip shown |
| 8 | Frontend records via real mutation | Fill one field, submit | Real `recordVitals` call with only the filled reading; list refetches |
| 9 | Frontend growth chart renders real trend data | Open chart with mocked `PATIENT_VITALS` | Weight series renders; height (empty) shows its own empty state |
| 10 | Full suite regression | Backend unit + integration; frontend `EncounterWorkspace` suite | 92/92 / 1505/1505; integration 4/4 / 387/387 unchanged; frontend 12/12 |
| 11 | Lint/typecheck clean | All touched files, no new lint warnings | 0 errors; hex-literal warning count unchanged (theme colors used for chart lines) |
