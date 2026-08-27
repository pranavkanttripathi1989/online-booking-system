import { computeNoShowRisk } from './no-show-risk';

describe('computeNoShowRisk (P1-17)', () => {
  const base = { noShowCount: 0, leadTimeDays: 5, isSelfBooked: false, noShowCountThreshold: 3 };

  it('a clean-history, staff-booked, mid-lead-time appointment is low risk', () => {
    const result = computeNoShowRisk(base);
    expect(result.level).toBe('low');
    expect(result.reasons).toEqual([]);
  });

  it('hitting the org\'s configured no-show threshold alone is enough to reach high risk', () => {
    const result = computeNoShowRisk({ ...base, noShowCount: 3, noShowCountThreshold: 3 });
    expect(result.level).toBe('high');
    expect(result.reasons).toContain('3 prior no-shows');
  });

  it('scales sub-threshold no-show history proportionally, not as a binary switch', () => {
    const one = computeNoShowRisk({ ...base, noShowCount: 1, noShowCountThreshold: 3 });
    const two = computeNoShowRisk({ ...base, noShowCount: 2, noShowCountThreshold: 3 });
    expect(one.score).toBeGreaterThan(0);
    expect(two.score).toBeGreaterThan(one.score);
    expect(two.score).toBeLessThan(computeNoShowRisk({ ...base, noShowCount: 3, noShowCountThreshold: 3 }).score + 1);
  });

  it('respects a per-org configured threshold, not a hardcoded one', () => {
    // The same 2 prior no-shows read as much riskier against a strict
    // threshold of 2 than a lenient threshold of 10.
    const strict = computeNoShowRisk({ ...base, noShowCount: 2, noShowCountThreshold: 2 });
    const lenient = computeNoShowRisk({ ...base, noShowCount: 2, noShowCountThreshold: 10 });
    expect(strict.score).toBeGreaterThan(lenient.score);
  });

  it('a far-out booking (>14 days lead time) adds risk', () => {
    const near = computeNoShowRisk({ ...base, leadTimeDays: 5 });
    const far = computeNoShowRisk({ ...base, leadTimeDays: 20 });
    expect(far.score).toBeGreaterThan(near.score);
    expect(far.reasons).toContain('Booked far in advance');
  });

  it('a same-day booking reduces risk, never below zero', () => {
    const result = computeNoShowRisk({ ...base, leadTimeDays: 0.2 });
    expect(result.score).toBe(0);
    expect(result.level).toBe('low');
  });

  it('a self-booked appointment (no staff relationship) adds risk over an identical staff-booked one', () => {
    const staffBooked = computeNoShowRisk({ ...base, noShowCount: 1 });
    const selfBooked = computeNoShowRisk({ ...base, noShowCount: 1, isSelfBooked: true });
    expect(selfBooked.score).toBeGreaterThan(staffBooked.score);
    expect(selfBooked.reasons).toContain('Self-booked, no staff follow-up yet');
  });

  it('caps the score at 100 and never exceeds it even when every risk factor stacks', () => {
    const result = computeNoShowRisk({ noShowCount: 20, leadTimeDays: 60, isSelfBooked: true, noShowCountThreshold: 3 });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.level).toBe('high');
  });

  it('never returns a negative score', () => {
    const result = computeNoShowRisk({ noShowCount: 0, leadTimeDays: 0, isSelfBooked: false, noShowCountThreshold: 3 });
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
