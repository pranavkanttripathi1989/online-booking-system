/**
 * REQ179 (IPD slice 3) — detecting an OT-booking mutual-exclusion
 * rejection. Same shape as `wards/bed-overlap.ts`'s own helper (see that
 * file's header for the full account of why constraint-name matching is
 * required instead of `err.code === '23P01'` — Prisma does not map
 * Postgres's exclusion-violation SQLSTATE to its own error codes).
 *
 * Two distinct constraints exist on `OtBookings`
 * (`20260902300000_ipd_ot_core`): theatre-overlap (turnaround folded into
 * the excluded range) and surgeon-overlap (turnaround excluded — it is
 * theatre cleaning time, not a constraint on the surgeon's calendar). Both
 * are checked, since either can reject the same `create`/`update` call and
 * the caller deserves the specific reason, not a generic one.
 */
export const OT_THEATRE_OVERLAP_CONSTRAINT = 'ot_bookings_no_theatre_overlap';
export const OT_SURGEON_OVERLAP_CONSTRAINT = 'ot_bookings_no_surgeon_overlap';

function messageIncludes(err: unknown, needle: string): boolean {
  const message = (err as { message?: unknown })?.message;
  return typeof message === 'string' && message.includes(needle);
}

export function isTheatreOverlapViolation(err: unknown): boolean {
  return messageIncludes(err, OT_THEATRE_OVERLAP_CONSTRAINT);
}

export function isSurgeonOverlapViolation(err: unknown): boolean {
  return messageIncludes(err, OT_SURGEON_OVERLAP_CONSTRAINT);
}
