// REQ172 -- Encounters.lmp_date is the only obstetric field this schema
// stores. Estimated Due Date and Gestational Age are always computed from
// it at render time, never persisted as their own columns -- the same
// "store the minimum, derive at read time" convention already used for
// chronic-registry recall status (chronic-registries.service.ts) and
// immunisation due-status (immunizations.service.ts).
//
// Naegele's rule (LMP + 280 days) is the standard obstetric estimate used
// throughout this reference material's own real-world source (a real
// gynaecology prescription) -- not a novel formula invented for this slice.

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EDD_OFFSET_DAYS = 280;

export interface ObstetricDates {
  edd: Date;
  gestational_age_weeks: number;
  gestational_age_days: number;
}

// `now` is an explicit parameter (never `new Date()` read internally) so a
// unit test can hand-derive the expected weeks/days for a fixed pair of
// dates instead of racing the real clock -- the same discipline this
// codebase's own CLAUDE.md account calls out for date/timezone-sensitive
// logic ("re-derive the math by hand before trusting the test").
export function computeObstetricDates(lmpDate: Date, now: Date): ObstetricDates {
  const edd = new Date(lmpDate.getTime() + EDD_OFFSET_DAYS * MS_PER_DAY);
  const elapsedDays = Math.max(0, Math.floor((now.getTime() - lmpDate.getTime()) / MS_PER_DAY));
  return {
    edd,
    gestational_age_weeks: Math.floor(elapsedDays / 7),
    gestational_age_days: elapsedDays % 7,
  };
}
