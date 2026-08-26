---
id: PLAN140
type: improvement
feature: insurance-claims
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ100
related: [TP164, TR164]
---

# PLAN140 — Wire PayerTariffs into a payer-charge estimate

Implementation plan for `REQ100`.

## Backend

**`backend/src/common/pricing/resolve-price.ts`** — `resolveServicePrice()`
gains a 5th, optional argument:

```ts
export function resolveServicePrice(
  product: PricingProduct | null | undefined,
  patient: PricingPatient | null | undefined,
  channel?: PaymentChannel,
  branchOverride?: BranchPriceOverride | null,
  payerTariffPaise?: number | null,
): number | null {
  if (!product) return null;
  if (branchOverride?.mode === 'skip') return null;
  if (payerTariffPaise != null) return payerTariffPaise;
  // ...existing branchOverride?.mode === 'override' / category / channel / base logic, unchanged
}
```

Placed after the `skip` check (a withdrawn service stays withdrawn even
with a tariff) but before the `override`/category/channel/base chain (a
tariff, once supplied, is definitive — it does not get further diluted by
category/channel rules). Update the function's own doc comment to record
the 5-way precedence and why (mirrors `REQ100`'s Design Decision section —
don't just repeat it, reference it).

No change to any existing call (`createRazorpayOrder`, `recordCounterPayment`,
`appointments.service.ts`'s display mapping) — the new argument is optional
and defaults to not-supplied, so all three keep their exact current
behavior with zero risk of regression.

**`backend/src/insurance/insurance.service.ts`** — new method:

```ts
async estimatedPayerCharge(productId: string, payerId: string, patientId: string | undefined, user: JwtPayload) {
  const product = await this.prisma.products.findUnique({ where: { id: productId } });
  if (!product || product.is_deleted) throw new BadRequestException('Service or product not found');
  if (!isSameOrg(user, product.client_org_id)) throw new BadRequestException('Service or product not found');
  const payer = await this.prisma.payers.findUnique({ where: { id: payerId } });
  if (!payer) throw new BadRequestException('Payer not found');
  let patient = null;
  if (patientId) {
    await this.assertPatientAccessible(patientId, user);
    patient = await this.prisma.patients.findUnique({ where: { id: patientId } });
  }
  const tariff = await this.prisma.payerTariffs.findUnique({
    where: { payer_id_product_id: { payer_id: payerId, product_id: productId } },
  });
  const amount = resolveServicePrice(product, patient, undefined, null, tariff?.tariff_price ?? undefined);
  return { amount_paise: amount, amount: amount != null ? amount / 100 : null, has_tariff: !!tariff };
}
```

**`backend/src/insurance/entities/insurance.entity.ts`** — new
`@ObjectType()` `PayerChargeEstimateType { amount: Float, has_tariff: Boolean }`
(rupees only exposed at the GraphQL boundary, matching every other money
field in this codebase — `amount_paise` stays internal, not on the GraphQL
type).

**`backend/src/insurance/insurance.resolver.ts`** — new query:

```ts
@Auth('manager', 'admin', 'super_admin', 'staff')
@Query(() => PayerChargeEstimateType)
estimatedPayerCharge(
  @Args('productId', { type: () => ID }) productId: string,
  @Args('payerId', { type: () => ID }) payerId: string,
  @Args('patientId', { type: () => ID, nullable: true }) patientId: string | undefined,
  @CurrentUser() user: JwtPayload,
) {
  return this.insuranceService.estimatedPayerCharge(productId, payerId, patientId, user);
}
```

Gate matches `findTariffs`'s own existing gate (front-desk/staff need this
for quoting, not just admin/manager) — verify the exact existing gate on
`findTariffs` before finalizing and match it exactly, don't invent a new one.

## Frontend

Read-only estimate — no dedicated new page. Add a small "Estimate payer
charge" affordance to wherever the existing Payer Tariffs admin UI lives
(`admin/Payers.jsx` or the insurance tab on `patients/detail.jsx` — check
which one already lists tariffs and slot in there): pick a product, see
the tariff (if any) vs. the standard price side by side. This is
explicitly a small UI addition, not a new page — confirm the exact existing
component before writing the plan's frontend file list in full during
implementation.

## Testing

`resolve-price.spec.ts` — new describe block "payer tariff (5th argument)":
- tariff supplied, no branch override → returns the tariff price, not
  category/channel/base.
- tariff supplied AND branch has `skip` stance → returns `null` (skip wins).
- tariff supplied AND branch has `override` stance → tariff still wins
  (tariff is checked before the override branch in the precedence chain).
- no tariff supplied → existing behavior unchanged (regression-guard case,
  reuse the existing describe block's fixtures).

`insurance.service.spec.ts` — new describe block "estimatedPayerCharge":
- returns the tariff amount when one exists, `has_tariff: true`.
- returns the base/category price when none exists, `has_tariff: false`.
- rejects a cross-org product.
- confirm whether "cross-org payer" is even a meaningful case (payers are
  global reference data like Languages — check `findPayers`'s own
  unscoped `findMany` before writing this case; adjust once confirmed,
  don't assume).
- a `'patient'`-role caller passing someone else's `patientId` is rejected
  via `assertPatientAccessible`.

`insurance.resolver.spec.ts` — role-gating case added to the existing
`it.each` table, matching `findTariffs`'s exact gate.

Live verification: query `estimatedPayerCharge` for a real seeded product
against the real "E2E Star Health" payer fixture already left in place
from `REQ068`'s own verification, both with and without a tariff row
present.
