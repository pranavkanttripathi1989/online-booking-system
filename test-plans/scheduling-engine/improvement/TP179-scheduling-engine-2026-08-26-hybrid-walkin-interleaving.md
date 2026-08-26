---
id: TP179
type: improvement
feature: scheduling-engine
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN159
related: []
---

# TP179 — Test plan: hybrid-mode walk-in interleaving

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | 3:1 interleaving | `interleaveByRatio([b1..b5], [w1,w2], 3)` | `[b1,b2,b3,w1,b4,b5,w2]` |
| 2 | Remainder appended (walk-ins outlast) | `interleaveByRatio([b1], [w1,w2,w3], 3)` | `[b1,w1,w2,w3]` |
| 3 | Remainder appended (booked outlast) | `interleaveByRatio([b1..b7], [w1], 3)` | `[b1,b2,b3,w1,b4,b5,b6,b7]` |
| 4 | Non-positive/non-integer ratio never loops forever | ratio `0`, `-3` | Treated as 1, terminates |
| 5 | `queueBoard` applies interleaving under a hybrid window with a ratio | Mocked hybrid window + mixed entries | Waiting list reordered per the ratio |
| 6 | `queueBoard` order unchanged with no hybrid window | Default (`clinicianAvailability.findFirst` → `null`) | Original `token_no`/`checked_in_at` order preserved |
| 7 | `queueBoard` order unchanged with a hybrid window but no ratio | `walkin_ratio: null` | Order unchanged |
| 8 | `Availability.walkinRatio` round-trips | `toGraphQL()` mapping | `a.walkin_ratio` → `walkinRatio` |
| 9 | Frontend form exposes the ratio | `manager/Availability.jsx` | "Booked:walk-in ratio" field shown only for hybrid mode; submit payload includes `walkin_ratio` |
| 10 | Full suite regression | Backend unit + integration | 92/92 / 1464/1464; integration 4/4 / 387/387 (one confirmed-transient failure, non-reproducing on re-run) |
| 11 | Lint/typecheck clean | backend + frontend touched files | 0 errors |
