---
id: TP195
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN175
related: []
---

# TP195 — Test plan: referral status-transition mutation

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Unknown referral rejected | `updateReferralStatus` on a missing id | `NotFoundException` |
| 2 | Cross-org referral rejected | Referral's encounter belongs to another org | `NotFoundException` |
| 3 | pending → scheduled | Legal transition | `referrals.update` called with the new status |
| 4 | pending → completed (skipping scheduled) | Legal transition | Accepted |
| 5 | pending → declined | Legal transition | Accepted |
| 6 | scheduled → completed | Legal transition | Accepted |
| 7 | Illegal backward transition | `scheduled → pending` | `BadRequestException`; `update` never called |
| 8 | Terminal `completed` rejects anything | `completed → scheduled` | `BadRequestException` |
| 9 | Terminal `declined` rejects anything | `declined → scheduled` | `BadRequestException` |
| 10 | Frontend shows legal buttons for `pending` | Render a pending referral | "Mark scheduled"/"Mark completed"/"Mark declined" all shown |
| 11 | Frontend shows no buttons for a terminal referral | Render a completed referral | No "Mark ..." buttons |
| 12 | Frontend advances via the real mutation | Click "Mark scheduled" | Real `updateReferralStatus` call; list refetches to show `scheduled`'s own legal buttons |
| 13 | Full suite regression | Backend unit + integration; frontend `EncounterWorkspace` suite | 92/92 / 1539/1539; integration 4/4 / 387/387 unchanged; frontend 15/15 |
| 14 | Lint clean, ratchet unchanged | `npm run lint` | 0 errors; 1909 warnings unchanged |
