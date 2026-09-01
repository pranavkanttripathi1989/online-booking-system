/**
 * REQ179 (IPD slice 1) — detecting a bed double-occupancy rejection.
 *
 * The database owns bed mutual exclusion via the
 * `bed_occupancies_no_double_occupancy` GiST EXCLUDE constraint
 * (20260902110000_ipd_adt_core). There is deliberately no application-level
 * lock: an availability check and the insert would be two statements, so N
 * concurrent requests could all pass the check before any of them wrote. The
 * constraint is what makes it atomic; this helper only lets the service layer
 * put a readable sentence in front of it.
 *
 * Postgres reports an exclusion violation as SQLSTATE 23P01, which Prisma does
 * **not** map to one of its own error codes — it surfaces as a
 * `PrismaClientUnknownRequestError` carrying the raw driver text, so
 * `err.code === '23P01'` silently never matches. Matched by constraint name
 * instead, exactly as `appointments.service.ts` already does for its own three
 * overlap constraints.
 *
 * Found by the integration spec rather than by review: the constraint fired
 * correctly and the caller still received a raw Postgres dump, because the
 * first implementation checked `err.code`.
 *
 * Lives in `wards/` rather than `admissions/` so the dependency runs the same
 * direction as the modules (AdmissionsModule imports WardsModule, never the
 * reverse).
 */
export const BED_OVERLAP_CONSTRAINT = 'bed_occupancies_no_double_occupancy';

/**
 * @param err any thrown value from a Prisma write against `BedOccupancies`
 * @returns true when it is the double-occupancy exclusion constraint rejecting
 */
export function isBedOverlapViolation(err: unknown): boolean {
  const message = (err as { message?: unknown })?.message;
  return typeof message === 'string' && message.includes(BED_OVERLAP_CONSTRAINT);
}
