---
id: CTX-patient-payments-2026-08-23-req040
type: improvement
feature: patient-payments
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ040
related: [REQ004, PLAN044, TP071, TR070]
---

# patient-payments — REQ040, Razorpay webhook + reconciliation + throttle (2026-08-23)

Closes `project-plans/analysis/06-execution-plan.md` P3.5 and the full scope of
`project-plans/analysis/02-findings-register.md` F-07 (the phase-plan row only named
the webhook half; F-07's own text also flagged the two unauthenticated,
unthrottled mutations as an abuse surface).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ040 | [webhook + reconciliation + abuse hardening](../../requirements/patient-payments/improvement/REQ040-patient-payments-2026-08-23-razorpay-webhook-and-order-abuse-hardening.md) |
| implementation-plans | PLAN044 | [implementation](../../implementation-plans/patient-payments/improvement/PLAN044-patient-payments-2026-08-23-razorpay-webhook-and-order-abuse-hardening.md) |
| test-plans | TP071 | [verification plan](../../test-plans/patient-payments/improvement/TP071-patient-payments-2026-08-23-razorpay-webhook-verification.md) |
| test-results | TR070 | [verification results](../../test-results/patient-payments/improvement/TR070-patient-payments-2026-08-23-razorpay-webhook-verification.md) |
| test-suggestions | — | skipped — a well-scoped improvement against an already-proven contract, not exploratory |

## What this closes

- `project-plans/analysis/06-execution-plan.md` P3.5.
- `project-plans/analysis/02-findings-register.md` F-07, in full (not just the
  webhook half the phase-plan row named).

## Real findings made while building this (not assumed)

- The global `GqlAuthGuard` genuinely 401s an unauthenticated REST request
  (not just GraphQL) — confirmed live against `account.controller.ts`/
  `org-branding.controller.ts` too, contradicting a pre-existing code
  comment's claim that the guard "can't protect a REST route correctly."
  The new webhook controller needed `@Public()` for this reason.
- `createRazorpayOrder`/`verifyRazorpayPayment` deliberately kept
  unauthenticated (not the literal fix F-07 suggested) — the public booking
  wizard genuinely depends on calling them anonymously, confirmed against
  `booking/index.jsx` and this session's own `BUG011`.

## What this does not close

- Refund/dispute webhook events — acknowledged and ignored, no refund flow
  exists anywhere in this codebase yet.
- GST invoicing on webhook-confirmed payment — no invoicing module exists.
