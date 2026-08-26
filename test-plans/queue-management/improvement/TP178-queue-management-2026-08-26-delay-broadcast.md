---
id: TP178
type: improvement
feature: queue-management
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN158
related: []
---

# TP178 — Test plan: delay broadcast to waiting patients

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Non-positive delay rejected | `broadcastDelay(clinicianId, 0, user)` / `-5` | `BadRequestException` |
| 2 | Cross-org rejected | Caller in org B, clinician in org A | `NotFoundException` |
| 3 | Honest notified-vs-waiting count | 2 waiting entries, 1 with a linked account | `{waiting_count: 2, notified_count: 1}`, `dispatch` called once |
| 4 | Only `waiting` entries targeted | Query assertion | `where` includes `status: 'waiting'` |
| 5 | Existing `notification-trigger.service.spec.ts` unaffected | Re-run | 24/24 still pass |
| 6 | Frontend dialog | `pages/queue/index.jsx` | "Report Delay" button opens a dialog; submit calls `broadcastQueueDelay`, shows a result snackbar |
| 7 | Full suite regression | Backend unit + integration | 91/91 / 1453/1453; integration 4/4 / 387/387 unchanged |
| 8 | Lint/typecheck clean | backend + frontend touched files | 0 errors |
