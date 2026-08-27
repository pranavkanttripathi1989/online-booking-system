// P1-17 — a real, deterministic no-show risk score, computed from data
// already on the model (no new patient-facing tracking added): prior
// no-show count, lead time between booking and the appointment, and
// booking channel (patient self-serve vs staff-booked). Weights are a
// documented, defensible first pass grounded in commonly-cited
// no-show-prediction factors (prior no-show history dominates; a longer
// lead time and a self-service channel both correlate with higher
// no-show rates in the literature this was modeled on) — NOT a fitted
// model against this org's own real outcome data, since none exists yet.
// Revisit with real data once enough appointments have real outcomes.

export type NoShowRiskLevel = 'low' | 'medium' | 'high';

export interface NoShowRiskInput {
  noShowCount: number;
  /** Days between when the appointment was booked and its own start time. */
  leadTimeDays: number;
  /** true when the caller who booked it was the patient themselves (no staff relationship/accountability). */
  isSelfBooked: boolean;
  /** The org's own configured threshold (ClientOrganizations.no_show_prepayment_threshold) — preserves per-org configurability of the dominant factor. */
  noShowCountThreshold: number;
}

export interface NoShowRiskResult {
  score: number; // 0-100, higher = riskier
  level: NoShowRiskLevel;
  reasons: string[];
}

const HIGH_LEVEL_CUTOFF = 70;
const MEDIUM_LEVEL_CUTOFF = 35;
const LONG_LEAD_TIME_DAYS = 14;
const SAME_DAY_LEAD_TIME_DAYS = 1;

export function computeNoShowRisk(input: NoShowRiskInput): NoShowRiskResult {
  const { noShowCount, leadTimeDays, isSelfBooked, noShowCountThreshold } = input;
  let score = 0;
  const reasons: string[] = [];

  // Prior no-show history — the single dominant factor, scaled against
  // the org's own configured threshold rather than a hardcoded number.
  // Weighted to 80 (not just the HIGH_LEVEL_CUTOFF of 70) so that hitting
  // the org's threshold alone is *always* enough to reach 'high', even
  // after the same-day discount below stacks against it in the worst
  // case (REQ052's own pre-existing guarantee: threshold reached ==
  // forced prepayment, unconditionally).
  if (noShowCount > 0) {
    const historyFraction = Math.min(1, noShowCount / Math.max(1, noShowCountThreshold));
    const historyPoints = Math.round(historyFraction * 80);
    score += historyPoints;
    reasons.push(`${noShowCount} prior no-show${noShowCount === 1 ? '' : 's'}`);
  }

  if (leadTimeDays > LONG_LEAD_TIME_DAYS) {
    score += 15;
    reasons.push('Booked far in advance');
  } else if (leadTimeDays < SAME_DAY_LEAD_TIME_DAYS) {
    score -= 10; // a same-day booking is almost always an urgent, kept visit
  }

  if (isSelfBooked) {
    score += 10;
    reasons.push('Self-booked, no staff follow-up yet');
  }

  score = Math.max(0, Math.min(100, score));
  const level: NoShowRiskLevel = score >= HIGH_LEVEL_CUTOFF ? 'high' : score >= MEDIUM_LEVEL_CUTOFF ? 'medium' : 'low';

  return { score, level, reasons };
}
