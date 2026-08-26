---
id: TP204
type: improvement
feature: notifications
created: 2026-08-27
updated: 2026-08-27
status: approved
parent: PLAN184
related: [REQ144]
---

# TP204 — Test plan for WhatsApp template-category routing + conversation metering

## `notification-trigger.service.spec.ts` (extended)

| # | Case | Expected |
|---|---|---|
| 1 | `resolveTemplateCategory` on every real transactional event | Always `'utility'`, never `'marketing'` |
| 2 | `resolveTemplateCategory('new_review')` / `('system_announcement')` | `'marketing'` |
| 3 | `resolveTemplateCategory` on a genuinely unmapped event | `'marketing'` (fails toward expensive, never free) |
| 4 | Successful WhatsApp send | Logged `template_category: 'utility'`, `billable: true`, `cost_micro_rupees: 115000` |
| 5 | Successful WhatsApp send of the marketing-classified event | `template_category: 'marketing'`, `cost_micro_rupees: 863100` |
| 6 | Failed WhatsApp send | `billable: false`, `cost_micro_rupees: null`, category still recorded |
| 7 | Successful SMS send (regression) | `template_category: null`, `billable: false`, `cost_micro_rupees: null` |

## `notification-billing.service.spec.ts` (new)

| # | Case | Expected |
|---|---|---|
| 1 | Org-bound caller, `orgId` argument supplied | `orgId` ignored — scoped to caller's own org |
| 2 | Platform operator, `orgId` supplied | Scoped to that specific org |
| 3 | Platform operator, no `orgId` | Unscoped — every org |
| 4 | IST month boundary at a UTC-day straddling the rollover | Bounds reflect the IST month, not the UTC one |
| 5 | Aggregation of multiple category rows | Correct `byCategory` mapping + summed total |
| 6 | A grouped row with a null category | Excluded from `byCategory` |
| 7 | No billable rows this period | Zeroed summary, not an error |

## `notifications.resolver.spec.ts` (extended)

| # | Case | Expected |
|---|---|---|
| 1 | `whatsappConversationSpend` role gate | `['manager', 'admin', 'super_admin']` |
| 2 | Argument passthrough | `user`, `orgId` forwarded unchanged to the billing service |
| 3 | Micro-rupee → rupee conversion | Every `costMicroRupees`/`totalCostMicroRupees` divided by 1,000,000 at this boundary |

## `org-settings.service.spec.ts` (extended)

| # | Case | Expected |
|---|---|---|
| 1 | Setting a cap in rupees | Converted and stored in paise |
| 2 | Field omitted | Stored cap left untouched (`undefined` sent to Prisma) |
| 3 | Explicit `null` | Cap cleared |
| 4 | Reading a configured cap | Converted back to rupees |
| 5 | Reading no cap | `undefined`, not `0` |

## `admin/Communications.test.jsx` (new, MockedProvider + MemoryRouter)

| # | Case | Expected |
|---|---|---|
| 1 | No billable spend yet | "No billable WhatsApp conversations yet this period" |
| 2 | Real category breakdown | Category rows, per-row cost, and total all render correctly formatted |
| 3 | A configured cap | Cap field pre-fills; "remaining" figure computed correctly |
| 4 | Spend exceeds the cap | "over cap" in place of a negative remaining figure |
| 5 | Saving a new cap | Mutation called with `{whatsapp_monthly_cap_rupees}` only (no email fields); success banner shown |
| 6 | Negative cap entered | Client-side validation error; mutation never called |

## Full-suite gate (Hard Rule 3)

```
cd backend  && npx jest --maxWorkers=2 && npx eslint "{src,apps,libs,test}/**/*.ts" && npx tsc --noEmit
cd frontend && npm run lint && npm test -- src/pages/admin/Communications.test.jsx && npm run build
node scripts/check-page-data-wiring.mjs
```

## Deliberately not covered

Live verification against a real WhatsApp send — no provider is
configured in this dev environment (`REQ144`'s own "deliberately not
built" section: no frontend UI exists yet to configure the org's
WhatsApp provider credentials, a separate, logged gap).
