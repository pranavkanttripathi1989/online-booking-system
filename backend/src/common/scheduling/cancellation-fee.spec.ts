import { selectApplicableRule, computeCancellationFee, hoursBetween, CancellationRule } from './cancellation-fee';

const orgWide: CancellationRule = { hours_before_appointment: 24, fee_type: 'percentage', fee_amount: 50, product_id: null, clinic_id: null, priority: 3 };
const clinicRule: CancellationRule = { hours_before_appointment: 12, fee_type: 'fixed', fee_amount: 20000, product_id: null, clinic_id: 'clin-a', priority: 2 };
const productClinicRule: CancellationRule = { hours_before_appointment: 6, fee_type: 'percentage', fee_amount: 100, product_id: 'prod-x', clinic_id: 'clin-a', priority: 1 };
const otherClinicRule: CancellationRule = { hours_before_appointment: 1, fee_type: 'fixed', fee_amount: 5000, product_id: null, clinic_id: 'clin-b', priority: 1 };

describe('selectApplicableRule', () => {
  it('picks the most specific rule (product+clinic) over clinic-only and org-wide', () => {
    const rule = selectApplicableRule([orgWide, clinicRule, productClinicRule], 'prod-x', 'clin-a');
    expect(rule).toBe(productClinicRule);
  });

  it('falls back to a clinic-only rule when no product+clinic rule matches', () => {
    const rule = selectApplicableRule([orgWide, clinicRule], 'prod-y', 'clin-a');
    expect(rule).toBe(clinicRule);
  });

  it('falls back to the org-wide rule when nothing more specific matches', () => {
    const rule = selectApplicableRule([orgWide, otherClinicRule], 'prod-y', 'clin-a');
    expect(rule).toBe(orgWide);
  });

  it('returns null when no rule at all applies (no policy configured)', () => {
    const rule = selectApplicableRule([otherClinicRule], 'prod-y', 'clin-a');
    expect(rule).toBeNull();
  });
});

describe('computeCancellationFee', () => {
  it('no rule configured: zero fee, full refund', () => {
    const result = computeCancellationFee(null, 100000, 2);
    expect(result).toEqual({ feeAmount: 0, refundAmount: 100000, appliedRule: null });
  });

  it('cancelling with enough notice (hours >= threshold): zero fee, full refund', () => {
    // 24h threshold, cancelled 30h before -> full refund.
    const result = computeCancellationFee(orgWide, 100000, 30);
    expect(result.feeAmount).toBe(0);
    expect(result.refundAmount).toBe(100000);
  });

  it('fixed fee below threshold, hand-derived: ₹1000 payment, ₹200 fixed fee -> ₹800 refund', () => {
    // clinicRule: fixed fee_amount 20000 paise (₹200), threshold 12h.
    // Cancelled 5h before (< 12h) -> fee applies.
    const result = computeCancellationFee(clinicRule, 100000, 5);
    expect(result.feeAmount).toBe(20000);
    expect(result.refundAmount).toBe(80000); // 100000 - 20000, hand-checked
  });

  it('percentage fee below threshold, hand-derived: ₹1000 payment, 50% fee -> ₹500 fee, ₹500 refund', () => {
    // orgWide: 50% fee, threshold 24h. Cancelled 2h before (< 24h) -> fee applies.
    // 100000 * 50 / 100 = 50000 paise, hand-checked.
    const result = computeCancellationFee(orgWide, 100000, 2);
    expect(result.feeAmount).toBe(50000);
    expect(result.refundAmount).toBe(50000);
  });

  it('a fee never exceeds the actual payment amount, even if the rule would compute more', () => {
    const bigFixedFee: CancellationRule = { hours_before_appointment: 24, fee_type: 'fixed', fee_amount: 999999, product_id: null, clinic_id: null, priority: 1 };
    const result = computeCancellationFee(bigFixedFee, 50000, 1);
    expect(result.feeAmount).toBe(50000); // clamped to the payment amount
    expect(result.refundAmount).toBe(0);
  });

  it('a zero or negative payment amount never produces a fee', () => {
    expect(computeCancellationFee(orgWide, 0, 1)).toEqual({ feeAmount: 0, refundAmount: 0, appliedRule: orgWide });
  });
});

describe('hoursBetween', () => {
  it('computes real elapsed hours, hand-derived', () => {
    const from = new Date('2026-09-01T10:00:00.000Z');
    const to = new Date('2026-09-02T16:00:00.000Z'); // 30 hours later, hand-counted
    expect(hoursBetween(from, to)).toBe(30);
  });

  it('never returns negative (a cancellation "after" the appointment clamps to 0)', () => {
    const from = new Date('2026-09-02T10:00:00.000Z');
    const to = new Date('2026-09-01T10:00:00.000Z');
    expect(hoursBetween(from, to)).toBe(0);
  });
});
