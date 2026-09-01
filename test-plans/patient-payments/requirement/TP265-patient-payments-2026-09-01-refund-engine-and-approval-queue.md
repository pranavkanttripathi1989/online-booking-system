---
id: TP265
type: requirement
feature: patient-payments
created: 2026-09-01
updated: 2026-09-01
status: approved
parent: PLAN245
related: [REQ176]
---

# TP265 — Test plan: refund engine + approval queue

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
a well-scoped extension mirroring `REQ056`'s already-proven
discount-approval pattern.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `selectApplicableRule` | Product+clinic beats clinic-only beats product-only beats org-wide; mismatched rule never applies; ties break on `priority` |
| 2 | `computeCancellationFee` | Enough notice → no fee, full refund; short notice → fixed/percentage fee, clamped to `[0, paymentAmount]` |
| 3 | `cancellation-rules` create/update — `product_id` cross-org | Rejected |
| 4 | `cancellation-rules` create — `rule_type` default/explicit | Defaults to `cancellation`; `reschedule` when requested |
| 5 | `findActiveRulesForOrg` | Queries by `client_org_id`+`rule_type`, maps to the pure-function shape |
| 6 | `requestRefund` — nonexistent/cross-org payment | Rejected, never confirms existence |
| 7 | `requestRefund` — payment not succeeded | Rejected |
| 8 | `requestRefund` — already requested/approved | Rejected |
| 9 | `requestRefund` — fee applies | `requested_amount` computed server-side, matches the policy engine |
| 10 | `requestRefund` — no matching rule | Full amount requested |
| 11 | `myClinicRefundRequests` — clinic given | Scoped to that clinic + org |
| 12 | `myClinicRefundRequests` — no clinic given | Scoped across the whole org; unscoped for a platform operator |
| 13 | `myClinicRefundRequests` — amount conversion | `requested_amount` in rupees, not paise |
| 14 | `decideRefundRequest` — requester decides own request | Rejected, even with a manager+ role |
| 15 | `decideRefundRequest` — already decided | Rejected |
| 16 | `decideRefundRequest` — reject | Marks both rows rejected, calls no gateway |
| 17 | `decideRefundRequest` — approve | Resolves the payment's own gateway, calls `.refund()`, updates state |
| 18 | `decideRefundRequest` — no gateway reference (counter payment) | Rejected with a clear message |
| 19 | `handleRazorpayWebhook` — `refund.processed`/`.failed` | Updates `refund_status`/`refunded_at`/`gateway_refund_id`; malformed payload handled distinctly from "ignored" |
| 20 | `paymentsForAppointment` | Cross-org returns `[]`; own-org returns rupee-converted rows |
| 21 | `appointments/detail.jsx` | "Request Refund" shown only for a cancelled appointment with a real refundable payment |
| 22 | `finances/index.jsx` Refunds tab | List/approve/reject mirrors the Discount Approvals tab |
| 23 | Tenancy matrix | `clinicRefundRequests` classified as a real `CASES` entry, passes cross-org isolation |
