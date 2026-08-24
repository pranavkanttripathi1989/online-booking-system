---
id: TP106
type: improvement
feature: patient-payments
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN079
related: [REQ056]
---

# TP106 — Test plan: day-end cash close + discount-approval workflow

Skipping the test-suggestion stage per CLAUDE.md's conditional rule — a
request/decide-later workflow matching `RightsRequests`' already-proven
shape, and a variance report matching this codebase's existing "compute
server-side from real rows, never trust the caller" convention. Going
straight to this approved test plan.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `recordCounterPayment` — discount with no reason | Rejected |
| 2 | `recordCounterPayment` — discount larger than the amount due | Rejected |
| 3 | `recordCounterPayment` — tenders sum to the pre-discount amount, not the net amount | Rejected |
| 4 | `recordCounterPayment` — discount at/below the org's threshold | Applied inline, `approved_by_user_id` stays null, no `DiscountApprovalRequests` row created |
| 5 | `recordCounterPayment` — discount above the org's threshold | Queued as a `DiscountApprovalRequests` row; `pending_approval_id` returned; no payment created |
| 6 | `recordCounterPayment` — a higher org-configured threshold | Respected — what would otherwise queue is applied inline |
| 7 | `decideDiscountApproval` — nonexistent request | Rejected |
| 8 | `decideDiscountApproval` — cross-org request | Rejected, never confirms cross-tenant existence |
| 9 | `decideDiscountApproval` — already-decided request | Rejected |
| 10 | `decideDiscountApproval` — the original requester, even holding manager+ | Rejected — cannot approve own request |
| 11 | `decideDiscountApproval` — reject decision | No payment created, request marked rejected |
| 12 | `decideDiscountApproval` — approve decision | Replays queued tenders, creates the payment, stamps the approver, links `resulting_payment_id` |
| 13 | `closeCashDrawer` — cross-org clinic | Rejected |
| 14 | `closeCashDrawer` — invalid `business_date` | Rejected |
| 15 | `closeCashDrawer` — happy path | Expected computed server-side from real succeeded tenders; variance = counted − expected, per tender type and in total |
| 16 | `closeCashDrawer` — second attempt for an already-closed clinic/date | Rejected (unique constraint) |
| 17 | `discountApprovalRequests()` — no `clinic_id` | Scoped to the caller's own org |
| 18 | `cashDrawerCloseouts()` — no `clinic_id` | Scoped to the caller's own org; breakdown correctly reconstructed from stored JSON |
| 19 | Tenancy matrix — `appointment-payments` domain's new `discountApprovalRequests` query | Own-org-only visibility enforced |

## Out of scope

Denomination-level breakdown, formal shift handover, a generic
`AuditLogs` write for the discount decision, retroactive edit of an
already-closed date, admin UI (backend-only per this batch's confirmed
direction).
