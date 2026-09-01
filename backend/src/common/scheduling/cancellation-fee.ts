// REQ176/REQ177 — finally reads ProductCancellationRules (REQ006), which
// existed as real admin CRUD but was never read outside its own module
// until this slice. The same table and the same computation serve both
// cancellation refunds (rule_type: 'cancellation') and reschedule fees
// (rule_type: 'reschedule') — the schema already anticipated both via its
// own RuleType enum, only the read path was missing.

export interface CancellationRule {
  hours_before_appointment: number;
  fee_type: 'fixed' | 'percentage';
  fee_amount: number; // paise, or basis-100 percentage points for 'percentage'
  product_id: string | null;
  clinic_id: string | null;
  priority: number;
}

export interface FeeComputation {
  feeAmount: number; // paise, clamped to [0, paymentAmount]
  refundAmount: number; // paise, paymentAmount - feeAmount
  appliedRule: CancellationRule | null;
}

// Most specific rule wins: product+clinic beats clinic-only beats
// product-only beats org-wide (no product, no clinic), then by the rule's
// own explicit priority (lower number = higher priority, matching
// cancellation-rules.service.ts's own `orderBy: priority asc` convention).
// A caller with no matching rule at all gets appliedRule: null — treated
// as "no policy configured", not a hidden 100%-fee default.
export function selectApplicableRule(rules: CancellationRule[], productId: string | null, clinicId: string | null): CancellationRule | null {
  const specificityOf = (r: CancellationRule): number => {
    const productMatches = r.product_id === productId;
    const clinicMatches = r.clinic_id === clinicId;
    if (r.product_id && productMatches && r.clinic_id && clinicMatches) return 4;
    if (r.clinic_id && clinicMatches && !r.product_id) return 3;
    if (r.product_id && productMatches && !r.clinic_id) return 2;
    if (!r.product_id && !r.clinic_id) return 1;
    return 0; // configured for a different product/clinic entirely -- never applies
  };
  const candidates = rules
    .map((r) => ({ rule: r, specificity: specificityOf(r) }))
    .filter((c) => c.specificity > 0)
    .sort((a, b) => b.specificity - a.specificity || a.rule.priority - b.rule.priority);
  return candidates[0]?.rule ?? null;
}

export function computeCancellationFee(rule: CancellationRule | null, paymentAmount: number, hoursBeforeAppointment: number): FeeComputation {
  if (!rule || paymentAmount <= 0) {
    return { feeAmount: 0, refundAmount: Math.max(0, paymentAmount), appliedRule: rule };
  }
  // Cancelling/rescheduling with enough notice: no fee, full refund.
  if (hoursBeforeAppointment >= rule.hours_before_appointment) {
    return { feeAmount: 0, refundAmount: paymentAmount, appliedRule: rule };
  }
  const rawFee = rule.fee_type === 'fixed' ? rule.fee_amount : Math.round((paymentAmount * rule.fee_amount) / 100);
  const feeAmount = Math.min(Math.max(0, rawFee), paymentAmount);
  return { feeAmount, refundAmount: paymentAmount - feeAmount, appliedRule: rule };
}

export function hoursBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / (1000 * 60 * 60));
}
