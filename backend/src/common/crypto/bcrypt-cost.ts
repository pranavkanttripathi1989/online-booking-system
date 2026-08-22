/**
 * The single source of truth for the bcrypt work factor (F-29).
 *
 * Three services independently declared `const BCRYPT_COST = 12` (auth, users,
 * staff). Duplicating a security parameter means it can drift in one place and
 * nobody notices, so it lives here now.
 *
 * Why it is configurable at all: at cost 12 a single hash is a few hundred
 * milliseconds by design, and `staff.service.spec.ts` verifies a real hash with
 * a real `bcrypt.compare`. Under `--maxWorkers=2` on a loaded machine that
 * intermittently blew Jest's 5s default timeout — the suite failed while
 * passing in isolation, which is the worst kind of failure to hand a CI runner,
 * because it teaches people to re-run rather than to read.
 *
 * Cost has no bearing on correctness, only on how expensive a hash is to
 * brute-force, so lowering it under test costs nothing real. Lowering it in
 * production would be a genuine security regression, so that is refused
 * outright rather than left to configuration discipline.
 */

const PRODUCTION_COST = 12;
const MINIMUM_PRODUCTION_COST = 12;

function resolveCost(): number {
  const raw = process.env.BCRYPT_COST;
  if (!raw) return PRODUCTION_COST;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 4 || parsed > 31) {
    throw new Error(`BCRYPT_COST must be an integer between 4 and 31, received "${raw}"`);
  }

  // The override exists for the test suite. Production must never take it.
  if (process.env.NODE_ENV === 'production' && parsed < MINIMUM_PRODUCTION_COST) {
    throw new Error(
      `BCRYPT_COST=${parsed} is below the production minimum of ${MINIMUM_PRODUCTION_COST}. ` +
        `Refusing to start with a weakened password hash cost.`,
    );
  }

  return parsed;
}

export const BCRYPT_COST = resolveCost();

/** Exported for the test that pins the production default. */
export const BCRYPT_PRODUCTION_COST = PRODUCTION_COST;
