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

// REQ055 (US-ORG-05) — a branch's own stance on an org-level master service:
// 'inherit' (the default, same as no row existing at all — resolve against
// the master exactly as before), 'override' (resolve entirely within this
// row's own category/channel/flat price, never falling through to the
// master), or 'skip' (this branch does not offer the service at all).
export interface BranchPriceOverride {
  mode: string;
  override_price?: number | null;
  override_category_pricing_json?: unknown;
  override_channel_pricing_json?: unknown;
}

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
 * Resolution order (REQ100 adds the payer tariff as the new highest
 * priority, just below a branch's own 'skip' stance): a branch's own
 * 'skip'/'override' stance (REQ055) is checked first since it is the most
 * specific thing known — a branch that deliberately customized or
 * withdrew a service should never fall through to the org master's own
 * pricing, not even for a payer tariff (a withdrawn service stays
 * withdrawn regardless of who's paying). Next, an explicitly-supplied
 * payer tariff (REQ100) — a contractually negotiated rate the caller has
 * deliberately decided to charge against; once supplied it is definitive
 * and is never diluted by the branch's own retail category/channel
 * pricing, which governs self-pay pricing only. Absent both, resolution
 * proceeds against the master product exactly as before REQ055/REQ100:
 * a branch 'override' stance, then patient-category override, then
 * channel override, then the base price. Category wins over channel
 * because it represents a standing commercial agreement (a corporate
 * contract, a staff discount) that should hold regardless of how the
 * visit happened to be booked or paid; channel is a lighter-weight,
 * situational adjustment.
 */
export function resolveServicePrice(
  product: PricingProduct | null | undefined,
  patient: PricingPatient | null | undefined,
  channel?: PaymentChannel,
  branchOverride?: BranchPriceOverride | null,
  payerTariffPaise?: number | null,
): number | null {
  if (!product) return null;

  if (branchOverride?.mode === 'skip') {
    return null;
  }

  if (payerTariffPaise != null) {
    return payerTariffPaise;
  }

  if (branchOverride?.mode === 'override') {
    const categoryPricing = asPricingMap(branchOverride.override_category_pricing_json);
    if (patient?.patient_category && categoryPricing[patient.patient_category] != null) {
      return categoryPricing[patient.patient_category];
    }
    const channelPricing = asPricingMap(branchOverride.override_channel_pricing_json);
    if (channel && channelPricing[channel] != null) {
      return channelPricing[channel];
    }
    return branchOverride.override_price ?? null;
  }

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
