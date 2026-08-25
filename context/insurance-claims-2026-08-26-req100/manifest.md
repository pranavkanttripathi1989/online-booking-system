---
id: CTX-insurance-claims-2026-08-26-req100
type: improvement
feature: insurance-claims
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ100
related: [PLAN140, TP164, TR164]
---

# insurance-claims — REQ100: payer-tariff pricing wiring (2026-08-26)

Slice of the reconciled 14-slice batch (`project-plans/10-next-14-slice-batch-reconciled.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ100 | [payer-tariff pricing wiring](../../requirements/insurance-claims/improvement/REQ100-insurance-claims-2026-08-26-payer-tariff-pricing-wiring.md) |
| implementation-plans | PLAN140 | [implementation plan](../../implementation-plans/insurance-claims/improvement/PLAN140-insurance-claims-2026-08-26-payer-tariff-pricing-wiring.md) |
| test-plans | TP164 | [verification plan](../../test-plans/insurance-claims/improvement/TP164-insurance-claims-2026-08-26-payer-tariff-pricing-wiring.md) |
| test-results | TR164 | [verification results — pass](../../test-results/insurance-claims/improvement/TR164-insurance-claims-2026-08-26-payer-tariff-pricing-wiring.md) |

## What shipped

Resolved `REQ068`'s own deferred design question: a payer tariff, once
explicitly supplied, ranks above branch/category/channel pricing but
below a branch's `skip` stance (a withdrawn service stays withdrawn).
`resolveServicePrice()` gained a 5th optional argument. New read-only
`estimatedPayerCharge(productId, payerId, patientId?)` query on the
`insurance` resolver — a front-desk/admin quoting tool, not a billing
mutation (no claim/pre-auth state machine exists yet, per `REQ031`'s
own P2 deferral).

**Scope correction**: shipped backend-only. Investigation found no
existing frontend surface for `PayerTariffs` at all — building an
"estimate" UI affordance would require building the base tariff
management UI first, a separate, larger slice.

## Verification

3/3 backend suites, 43/43 tests. `tsc --noEmit` clean — the new
optional 5th parameter doesn't affect any of `resolveServicePrice()`'s
3 existing call sites.
