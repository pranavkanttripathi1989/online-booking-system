/**
 * Environment for the integration suite, applied before any module loads.
 *
 * These are set here rather than read from backend/.env on purpose. The whole
 * point of this suite is that it can destroy and rebuild its database on every
 * run; if it ever picked up the dev DATABASE_URL it would wipe the dev data the
 * Playwright e2e suite runs against. Pinning the URL here means that cannot
 * happen by accident, even if someone runs the config from the wrong directory.
 */

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://medibook:medibook_test_secret@localhost:5433/medibook_test';

// Guard against the footgun described above.
if (/@localhost:5432\/|medibook_db/.test(TEST_DATABASE_URL)) {
  throw new Error(
    `Refusing to run the integration suite against what looks like the dev database:\n` +
      `  ${TEST_DATABASE_URL}\n` +
      `This suite truncates every table. Point TEST_DATABASE_URL at postgres_test (port 5433).`,
  );
}

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';

// Fixed, non-secret test values. JwtStrategy throws at construction if
// JWT_ACCESS_SECRET is unset (auth/strategies/jwt.strategy.ts) — that fail-closed
// behaviour is BUG002's fix and is deliberately not bypassed here; the suite
// supplies a real secret instead of the code tolerating a missing one.
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'integration-test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'integration-test-refresh-secret';
process.env.JWT_ACCESS_TTL = '15m';
process.env.JWT_REFRESH_TTL = '7d';

// AES-256-GCM key for common/crypto/secrets.ts — 64 hex chars, same convention
// as src/test-setup.ts uses for the unit suite.
process.env.SETTINGS_ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY ?? '0'.repeat(64);

// P1-05 — this file's own `?? 'redis://localhost:6379'` fallback has never
// actually applied: global-setup.ts's `import { PrismaClient } from
// '@prisma/client'` (required once, before any setupFile, in the SAME
// process this suite runs in under --runInBand) triggers Prisma's own
// implicit `.env` auto-load as a side effect, which sets process.env.REDIS_URL
// to backend/.env's `redis://redis:6379` — a hostname that only resolves
// inside the Docker Compose network, not from this host-run suite. This was
// invisible until now because no prior integration-suite code path ever
// actually talked to Redis; P1-05's own slot-hold spec was the first to hit
// it (ioredis retries a DNS failure with backoff, so it doesn't fail fast —
// it hangs for ~10s per call, then reports "max retries per request limit").
// Rewritten from `??` to an explicit strip-and-replace of that one known-
// wrong value, matching TEST_DATABASE_URL's own guard above: a real,
// deliberately-exported override (e.g. from CI) still wins.
if (!process.env.REDIS_URL || /^redis:\/\/redis:/.test(process.env.REDIS_URL)) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}
