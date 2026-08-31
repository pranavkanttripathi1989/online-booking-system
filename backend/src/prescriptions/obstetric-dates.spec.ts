import { computeObstetricDates } from './obstetric-dates';

// Hand-derived from a real reference prescription (LMP 21-12-2025), not
// invented numbers -- each expected value below is independently
// verifiable by counting days on a calendar, matching this codebase's own
// "re-derive the math by hand before trusting the test" discipline for
// date-sensitive logic.
describe('computeObstetricDates', () => {
  const lmp = new Date('2025-12-21T00:00:00.000Z');

  it('computes EDD as LMP + 280 days (Naegele\'s rule)', () => {
    const { edd } = computeObstetricDates(lmp, new Date('2026-06-07T00:00:00.000Z'));
    expect(edd.toISOString().slice(0, 10)).toBe('2026-09-27');
  });

  it('computes gestational age at 24 weeks 0 days on 07-Jun-2026', () => {
    const result = computeObstetricDates(lmp, new Date('2026-06-07T00:00:00.000Z'));
    expect(result.gestational_age_weeks).toBe(24);
    expect(result.gestational_age_days).toBe(0);
  });

  it('computes gestational age at 21 weeks 6 days on 23-May-2026', () => {
    const result = computeObstetricDates(lmp, new Date('2026-05-23T00:00:00.000Z'));
    expect(result.gestational_age_weeks).toBe(21);
    expect(result.gestational_age_days).toBe(6);
  });

  it('never returns negative elapsed time for a "now" before the LMP date', () => {
    const result = computeObstetricDates(lmp, new Date('2025-12-01T00:00:00.000Z'));
    expect(result.gestational_age_weeks).toBe(0);
    expect(result.gestational_age_days).toBe(0);
  });
});
