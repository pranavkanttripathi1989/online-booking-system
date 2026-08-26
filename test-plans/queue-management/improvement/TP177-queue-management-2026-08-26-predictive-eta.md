---
id: TP177
type: improvement
feature: queue-management
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN157
related: []
---

# TP177 — Test plan: predictive rolling-median ETA

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Today-only average unchanged | Board with one today-entry (10 min wait) | `average_wait_minutes` = 10 |
| 2 | Median diverges from average | Board with a today-entry (10 min) + a 3-day-old entry (20 min) | `average_wait_minutes` = 10, `predicted_wait_minutes` = 15 (median of [10, 20]) |
| 3 | Empty window | No completed visits in the trailing 14 days | `predicted_wait_minutes` is `undefined` |
| 4 | Cross-org/self-scope rejections unaffected | Existing tenant-isolation cases | Still reject as before |
| 5 | Frontend displays the new figure | `pages/queue/index.jsx` | Query requests `predicted_wait_minutes`; renders "Predicted wait (last 14 days): N min" when present |
| 6 | Full suite regression | Backend unit + integration | 91/91 / 1449/1449; integration 4/4 / 387/387 unchanged |
| 7 | Lint/typecheck clean | backend + frontend touched files | 0 errors |
