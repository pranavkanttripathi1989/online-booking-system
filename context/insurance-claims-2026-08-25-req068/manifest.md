---
id: CTX-insurance-claims-2026-08-25-req068
type: improvement
feature: insurance-claims
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ068
related: [PLAN095, TP122, TR121]
---

# insurance-claims — Payer tariffs (2026-08-25)

One of an 8-slice backend batch. Closes `REQ031`'s own `US-INS-02`: new
`PayerTariffs` master data (`payer_id` + `product_id` → negotiated
price), org-scoped, Hard-Rule-6-validated. Deliberately not wired into
`resolveServicePrice()` — a real, logged, deferred design decision.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ068 | [Payer tariffs](../../requirements/insurance-claims/improvement/REQ068-insurance-claims-2026-08-25-payer-tariffs.md) |
| implementation-plans | PLAN095 | [implementation plan](../../implementation-plans/insurance-claims/improvement/PLAN095-insurance-claims-2026-08-25-payer-tariffs.md) |
| test-plans | TP122 | [test plan](../../test-plans/insurance-claims/improvement/TP122-insurance-claims-2026-08-25-payer-tariffs.md) |
| test-results | TR121 | [results](../../test-results/insurance-claims/improvement/TR121-insurance-claims-2026-08-25-payer-tariffs.md) |

## A scope swap worth recording

This slice's original candidate — an org-level notification
sender-identity setting — was found redundant during research (every
notification provider already collects its own sender identity as a
credential field) and swapped for this one before any code shipped. See
`PLAN095` for the full account, including the corrective migration that
reverts the schema fields that were briefly added.

## Live verification

`setPayerTariff`/`payerTariffs` confirmed against the real "E2E Star
Health" payer and "GP Consultation" product; left in place as inert
reference data.
