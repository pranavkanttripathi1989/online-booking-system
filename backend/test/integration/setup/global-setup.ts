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
