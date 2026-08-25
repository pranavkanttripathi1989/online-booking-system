import { PrismaClient } from '@prisma/client';

// REQ016 (US-CAT-05) — every price change logged with who/when/old/new, and
// a future-dated change deferred rather than applied immediately. A single
// shared helper, not duplicated per call site — products.service.ts and
// services.service.ts both write to the same underlying Products table
// (services ARE Products with product_type: 'service') and must apply this
// identically, matching resolve-price.ts's own established precedent for
// why this codebase shares price logic rather than re-deriving it per
// domain.
//
// Returns the price Products.price should actually be set to right now:
// the new price for an immediate change, or the CURRENT (unchanged) price
// when the change is deferred to the future — the caller's own update()
// must use this return value for its own `price` write, not `input.price`
// directly, or a future-dated change would still take effect immediately.
export async function recordPriceChangeIfNeeded(
  prisma: Pick<PrismaClient, 'priceHistory'>,
  params: {
    product_id: string;
    client_org_id: string | null;
    old_price: number | null;
    new_price: number | undefined;
    effective_from: string | undefined;
    changed_by_user_id: string;
  },
): Promise<number | null | undefined> {
  const { product_id, client_org_id, old_price, new_price, effective_from, changed_by_user_id } = params;

  if (new_price === undefined || new_price === old_price) {
    // No price field sent, or sent but unchanged -- nothing to log, nothing
    // to defer. Returning undefined tells the caller to leave its own
    // `price` write alone (Prisma's own "key not supplied" semantics).
    return undefined;
  }

  const effectiveDate = effective_from ? new Date(effective_from) : new Date();
  const applied = effectiveDate.getTime() <= Date.now();

  await prisma.priceHistory.create({
    data: {
      product_id,
      client_org_id: client_org_id ?? undefined,
      old_price: old_price ?? undefined,
      new_price,
      effective_from: effectiveDate,
      applied,
      changed_by_user_id,
    },
  });

  return applied ? new_price : old_price;
}
