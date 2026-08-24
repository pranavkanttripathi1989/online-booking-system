// REQ016 (US-CAT-04) — differentiated pricing by patient category and
// channel. A single shared resolution function, deliberately not
// duplicated per call site: research before this slice found price was
// being read from TWO independent places (appointments.service.ts's
// display mapping, appointment-payments.service.ts's charge-computation),
// and having them each re-derive the "right" price independently is
// exactly the shape of bug that would let a patient see one price and be
// charged another. Both real call sites now import and call this same
// function instead of reading Products.price directly.
//
// `channel` is deliberately tied to the PAYMENT mechanism, not the booking
// mechanism: an online Razorpay payment is the 'online' channel; the
// counter/mixed-tender payment mutation (REQ023, US-BIL-01) is 'walkin'.
// This is more defensible than inferring channel from which booking
// mutation created the appointment (a walk-in-booked patient can still pay
// online, and vice versa) and avoids a display-vs-charge consistency risk
// at the one place (appointments.service.ts's display mapping) where the
// actual payment channel isn't known yet — that call site omits `channel`
// entirely rather than guessing, applying only the patient-category
// override as a preview.

export interface PricingProduct {
  price: number | null;
  category_pricing_json?: unknown;
  channel_pricing_json?: unknown;
}

export interface PricingPatient {
  patient_category?: string | null;
}

export type PaymentChannel = 'online' | 'walkin';

// Both JSON columns store rupees the same way Products.price itself is
// documented (money convention: paise at rest -- but these are Json
// columns, not the schema-level Int the money convention targets, and are
// keyed by category/channel name -> a plain number). Stored in PAISE to
// match Products.price's own unit exactly, converted to rupees only at the
// resolver boundary like every other money field in this codebase.
function asPricingMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, number>;
}

/**
 * Resolution order: patient-category override wins over channel override,
 * which wins over the base price. Category wins because it represents a
 * standing commercial agreement (a corporate contract, a staff discount)
 * that should hold regardless of how the visit happened to be booked or
 * paid; channel is a lighter-weight, situational adjustment.
 */
export function resolveServicePrice(
  product: PricingProduct | null | undefined,
  patient: PricingPatient | null | undefined,
  channel?: PaymentChannel,
): number | null {
  if (!product) return null;

  const categoryPricing = asPricingMap(product.category_pricing_json);
  if (patient?.patient_category && categoryPricing[patient.patient_category] != null) {
    return categoryPricing[patient.patient_category];
  }

  const channelPricing = asPricingMap(product.channel_pricing_json);
  if (channel && channelPricing[channel] != null) {
    return channelPricing[channel];
  }

  return product.price ?? null;
}
