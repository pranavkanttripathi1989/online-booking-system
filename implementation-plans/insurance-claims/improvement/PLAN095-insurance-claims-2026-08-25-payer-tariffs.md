---
id: PLAN095
type: improvement
feature: insurance-claims
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ068
related: []
---

# PLAN095 — Implementation plan for payer tariffs

## A scope swap, made before any code was written

This slice's original candidate was an org-level notification
sender-identity setting (`whatsapp_sender_name`/`sms_sender_id` on
`ClientOrganizations`). Research before implementation found this
redundant: `msg91.provider.ts`, `gupshup.provider.ts`,
`gupshup-whatsapp.provider.ts`, and `twilio.provider.ts` each already
require their own sender-identity field as part of the org's stored
credentials (`REQ008`'s own per-provider registry). Building a second,
parallel org-level concept for the same thing would have been dead
configuration nothing read. The schema fields, DTO/entity/service
wiring, and org-settings resolver additions were added, then fully
reverted (a corrective follow-up migration drops the 2 columns) before
this slice was rescoped to `REQ031`'s own `US-INS-02` instead. This is
recorded here, not silently absorbed, because it's a real example of
research changing a batch's own scope mid-flight — worth knowing this
happened, not just what shipped in its place.

## Schema

`PayerTariffs`: `id`, `payer_id` (FK), `product_id` (FK), `client_org_id`,
`tariff_price Int`, `updated_at`. `@@unique([payer_id, product_id])` —
the upsert key. Indexed on `client_org_id` and `payer_id`.

## Changes

**`insurance.service.ts`**: `findTariffs(payerId?, productId?, user)` —
`orgScope` plus optional filters. `setPayerTariff(input, user)` —
`payers.findUnique` (404 if missing), `products.findUnique` +
`isSameOrg` check (Hard Rule 6, rejects a cross-org product without
confirming its existence to the caller), then
`payerTariffs.upsert({where: {payer_id_product_id: {...}}, create, update})`.
`tariffToGraphQL()` converts paise → rupees and flattens `product.name`
onto `product_name`.

**`insurance.resolver.ts`**: `payerTariffs` (staff+), `setPayerTariff`
(manager+).

## Testing (see `TP122`)

`insurance.service.spec.ts` extended — 5 new cases: org-scoping,
paise↔rupee conversion + product-name flattening, unknown payer
rejection, cross-org product rejection (Hard Rule 6, asserts `upsert`
never called), and the upsert call shape itself (both `create` and
`update` branches carry the converted price).

## Live verification

Real `setPayerTariff` against the seeded "E2E Star Health" payer and the
"GP Consultation" product (₹350) — read back via `payerTariffs`,
round-tripped correctly. Left in place as new reference data with zero
real effect (not wired into billing), matching this codebase's own
"new rows created for a test are left in place" convention.
