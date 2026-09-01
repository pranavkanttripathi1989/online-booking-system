---
id: TP267
type: requirement
feature: platform-billing
created: 2026-09-02
updated: 2026-09-02
status: approved
parent: PLAN247
related: [REQ178]
---

# TP267 — Test plan: super-admin tenant subscription management

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
this reuses already-proven patterns from `REQ175`–`177`'s own gateway
adapters and the existing `Plans`/`assignPlan` entitlement mechanism, not
a first-of-its-kind contract.

## Backend cases

| # | Case | Expected |
|---|---|---|
| 1 | `createSubscription` — org not found or deleted | Rejected, no gateway call made |
| 2 | `createSubscription` — org already has an active/trialing/past_due/grace subscription | Rejected, no duplicate row |
| 3 | `createSubscription` — plan not found, inactive, or no current version | Rejected |
| 4 | `createSubscription` — unknown gateway | Rejected before any network call |
| 5 | `createSubscription` — gateway call throws | Rejected with the gateway's own error message, no DB row created |
| 6 | `createSubscription` — happy path | `trialing` row created, current `PlanVersion` id/price locked in, `authenticationUrl` returned when the gateway provides one |
| 7 | `cancelSubscription` — subscription not found / already cancelled | Rejected |
| 8 | `cancelSubscription` — graceful (default) | `cancel_at_period_end: true`, entitlements untouched |
| 9 | `cancelSubscription` — immediate | `status: cancelled`, `assignPlan(orgId, null)` called |
| 10 | `applyBillingEvent` — all 7 event types | Correct state transition per type, unknown subscription/`ignored` type is a no-op |
| 11 | `applyBillingEvent — charge_succeeded` on an annual subscription recovering from `past_due` | Extends by 12 months, not 1 |
| 12 | `applyBillingEvent — charge_succeeded` on a `cancel_at_period_end` subscription | Finalizes cancellation, does not renew |
| 13 | `retryInvoice` — not found / already paid | Rejected |
| 14 | `retryInvoice` — happy path | `retry_attempted` dunning event logged |
| 15 | Razorpay adapter — `createSubscription` request shape | Plan created first, `total_count` 120 monthly / 10 annual |
| 16 | Razorpay adapter — `verifyWebhookSignature` | Genuine HMAC accepted, wrong-secret/missing-header rejected |
| 17 | Razorpay adapter — `parseWebhookEvent` | All 6 real event names map correctly, unknown → `ignored` |
| 18 | Stripe adapter — every request is form-encoded, never JSON | Confirmed on all 3 create-flow requests |
| 19 | Stripe adapter — `verifyWebhookSignature` | Genuine `t=...,v1=...` accepted within 5 min, stale timestamp rejected (replay protection) |
| 20 | Stripe adapter — `parseWebhookEvent` | All 4 real event names map correctly |
| 21 | Dunning sweep — `generateUpcomingInvoices` | Skips a subscription with an invoice already generated for the cycle; continues the loop past one failure |
| 22 | Dunning sweep — `escalatePastDue` | Logs `retry_scheduled` on day 1/3/7, no duplicate same-day log, suspends + revokes entitlements at day 10 |
| 23 | Dunning sweep — `finalizeExpiredGracefulCancellations` | Finalizes a subscription past its own period end with no gateway confirmation |
| 24 | Tenancy matrix classification | `platform-billing` correctly listed `EXEMPT`, not `CASES` or an unclassified gap |

## Frontend cases

| # | Case | Expected |
|---|---|---|
| 25 | Empty state | "No subscriptions yet" shown, not a fabricated row |
| 26 | Real subscription list | Renders from `platformSubscriptions`, not mock data |
| 27 | Create flow — tenant search | Debounced Autocomplete against `organizationsPaginated`; selecting an option does not re-trigger a search on the option's own display label |
| 28 | Create flow — full submit | `createPlatformSubscription` called with the right input shape; a returned `authentication_url` renders as a copyable setup link |
| 29 | Cancel — typed confirmation | Confirm stays disabled until the typed text exactly matches the tenant's org name and a reason is entered |
| 30 | Cancel — graceful submit | `cancelPlatformSubscription` called with `immediately: false`; success message reflects the graceful wording |
| 31 | Invoice retry | `retryPlatformInvoice` called for a `failed`-status row only |
