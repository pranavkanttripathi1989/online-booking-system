---
id: TP105
type: improvement
feature: organizations
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN078
related: [REQ055]
---

# TP105 — Test plan: org->branch masters cascade

Skipping the test-suggestion stage per CLAUDE.md's conditional rule —
routine config-table CRUD matching `cancellation-rules`' already-proven
pattern, extending an already-proven pure-function pricing helper. Going
straight to this approved test plan.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `resolveServicePrice()` — no branch override argument | Unaffected, identical to pre-`REQ055` behaviour |
| 2 | `resolveServicePrice()` — explicit `null` override | Same as omitted |
| 3 | `resolveServicePrice()` — `mode: 'inherit'` | Resolves against the master, unchanged |
| 4 | `resolveServicePrice()` — `mode: 'skip'` | Returns `null` regardless of category/channel |
| 5 | `resolveServicePrice()` — `mode: 'override'`, flat price only | Returns the override's own price |
| 6 | `resolveServicePrice()` — `mode: 'override'` with its own category pricing | Category wins over the override's own flat price |
| 7 | `resolveServicePrice()` — `mode: 'override'` with its own channel pricing | Channel wins over the override's own flat price |
| 8 | `resolveServicePrice()` — `mode: 'override'` | Never reads the master's own category/channel pricing |
| 9 | `productBranchOverrides()` — clinic in caller's org | Returns that clinic's overrides |
| 10 | `productBranchOverrides()` — cross-org clinic | `[]`, no throw |
| 11 | `productBranchOverrides()` — nonexistent clinic | `[]` |
| 12 | `productBranchOverrides()` — platform operator, any clinic | Allowed |
| 13 | `productBranchOverrides()` — no `clinic_id`, org A vs org B | Each scoped to their own org only |
| 14 | `setProductBranchOverride` — cross-org clinic | Rejected |
| 15 | `setProductBranchOverride` — product belongs to a different org than the clinic | Rejected |
| 16 | `setProductBranchOverride` — product is already clinic-scoped (not a master) | Rejected |
| 17 | `setProductBranchOverride` — `mode: 'override'` with no price/category/channel given | Rejected |
| 18 | `setProductBranchOverride` — happy path | Upserted; rupees converted to paise; `client_org_id` stamped from the clinic |
| 19 | `getForPricing` — missing product or clinic id | Returns `null`, no DB lookup performed |
| 20 | `getForPricing` — no override row | Returns `null` (today's existing default) |
| 21 | `getForPricing` — a real row | Returns the raw paise-unit shape `resolveServicePrice()` expects |
| 22 | `createRazorpayOrder` — branch override in effect | Charges the override price, not the master price |
| 23 | `createRazorpayOrder` — branch has skipped the service | Rejected (no priced product), no Razorpay call made |
| 24 | `recordCounterPayment` — branch override in effect | Tenders must match the override price, not the master price |
| 25 | `recordCounterPayment` — branch has skipped the service | Rejected, no payment row created |
| 26 | Tenancy matrix — `branch-overrides` domain, every role in `allowedRoles` | Own-org-only visibility enforced |

## Out of scope

Admin UI for setting overrides, the `appointments.service.ts` display-
preview gap (documented in `REQ055` as a named follow-up), any change to
retail `Products`' own clinic-scoping — frontend UI is backend-only per
this batch's confirmed direction.
