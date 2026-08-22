import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { TEST_DATABASE_URL } from './env';
import { buildFixture } from './fixture';

/**
 * Runs once, before any suite. Brings the throwaway test database up to the
 * current migration state and lays down the two-tenant fixture.
 *
 * `migrate deploy` (not `db push`) on purpose: it applies the same migration
 * files production will, so a hand-written migration that is valid Prisma but
 * invalid SQL fails here rather than on deploy. CLAUDE.md notes those files get
 * no diff/review safety net because `migrate dev` cannot run in this
 * environment — this is the closest thing to one.
 */
export default async function globalSetup(): Promise<void> {
  process.env.DATABASE_URL = TEST_DATABASE_URL;

  // Drop and recreate the schema before migrating. The suite owns this database
  // outright and rebuilds it every run, so starting from empty costs nothing and
  // removes a whole class of "works on my machine".
  //
  // It also self-heals a specific poisoning that actually happened: running
  // `prisma migrate diff` with this database as its --shadow-database-url wiped
  // `_prisma_migrations` while leaving the tables, after which `migrate deploy`
  // refused with P3005 ("database schema is not empty") and the suite could not
  // start at all until the schema was dropped by hand.
  const reset = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
  try {
    // One statement per call: Prisma sends these as prepared statements, and a
    // semicolon-separated pair is rejected rather than run as two.
    await reset.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE');
    await reset.$executeRawUnsafe('CREATE SCHEMA public');
  } catch (e: any) {
    // Do not swallow this. If the reset silently fails, `migrate deploy` reports
    // P3005 ("schema is not empty") and the real cause is two steps away.
    throw new Error(
      `Could not reset the integration test database at ${TEST_DATABASE_URL}.\n\n` +
        `Is it running?  docker compose --profile test up -d postgres_test\n\n${e?.message ?? e}`,
    );
  } finally {
    await reset.$disconnect();
  }

  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    });
  } catch (e: any) {
    const detail = [e?.stdout?.toString(), e?.stderr?.toString()].filter(Boolean).join('\n');
    throw new Error(
      `Could not prepare the integration test database at ${TEST_DATABASE_URL}.\n\n` +
        `Start it first:\n  docker compose --profile test up -d postgres_test\n\n${detail}`,
    );
  }

  const prisma = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
  try {
    await buildFixture(prisma);
  } finally {
    await prisma.$disconnect();
  }
}
