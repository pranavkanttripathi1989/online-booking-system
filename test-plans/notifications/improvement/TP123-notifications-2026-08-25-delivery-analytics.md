---
id: TP123
type: improvement
feature: notifications
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN096
related: [REQ069]
---

# TP123 — Test plan for notification delivery analytics

## `notification-trigger.service.spec.ts` (extended)

| # | Case | Expected |
|---|---|---|
| 1 | Daily-cap query | Filters `status: 'sent'` |
| 2 | Failed SMS attempt | Logged `status: 'failed'`, provider error message recorded |
| 3 | Successful SMS attempt | Logged `status: 'sent'`, no error message |

## `notifications.service.spec.ts` (extended)

| # | Case | Expected |
|---|---|---|
| 1 | Regular org-scoped caller | `groupBy` `where: {client_org_id}` |
| 2 | Platform operator | `groupBy` `where: {}` (unscoped) |
| 3 | Row flattening | `_count._all` → `count` |

## Full-suite gate (Hard Rule 3)

```
cd backend && npx jest --maxWorkers=2 && npm run test:int && npx eslint "{src,apps,libs,test}/**/*.ts" && npx tsc --noEmit
```

## Live verification

`notificationDeliveryAnalytics` queried against the real dev DB.
