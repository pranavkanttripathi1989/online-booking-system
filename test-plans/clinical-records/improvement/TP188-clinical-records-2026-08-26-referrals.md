---
id: TP188
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN168
related: []
---

# TP188 — Test plan: referrals

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Locked encounter rejected | `createReferral` on a locked encounter | `BadRequestException`; `referrals.create` never called |
| 2 | No named clinician | Referral with only specialty/reason | Created; `clinicians.findUnique` never called; `urgency: 'routine'` default |
| 3 | Explicit urgency | Referral with `urgency: 'urgent'` | Created row has `urgency: 'urgent'` |
| 4 | Named clinician, same org | `referred_to_clinician_id` resolves to caller's own org | Accepted; `referred_to_clinician_id` persisted |
| 5 | Named clinician, different org | `referred_to_clinician_id` resolves to another org | `NotFoundException`; `referrals.create` never called |
| 6 | Named clinician, nonexistent | `referred_to_clinician_id` matches no row | `NotFoundException` |
| 7 | Appears on refetch | Refer, then `encounter()` on the same id | `referrals` includes the new referral |
| 8 | Frontend empty state | `EncounterWorkspace` with no referrals | "No referrals made yet." shown |
| 9 | Frontend renders real referrals | `EncounterWorkspace` with one referral | Specialty + reason rendered, not fabricated |
| 10 | Frontend refers via real mutation | Fill dialog, submit | Real `createReferral` call with typed fields; list re-fetches to show it |
| 11 | Full suite regression | Backend unit + integration; frontend `EncounterWorkspace` suite | 92/92 / 1491/1491; integration 4/4 / 387/387 unchanged; frontend 9/9 |
| 12 | Lint/typecheck clean | All touched files, no new lint warnings | 0 errors; hex-literal warning count unchanged |
