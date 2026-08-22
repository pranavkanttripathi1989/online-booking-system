/**
 * Integration-test project (F-25 / BUG007).
 *
 * Deliberately a SECOND jest config rather than a change to jest.config.js.
 * The unit config is `rootDir: 'src'` + `.spec.ts` and must keep working
 * untouched: it is the fast feedback loop (641 tests, ~130s, all Prisma
 * mocked). This one boots the real Nest app against a real PostgreSQL and is
 * an order of magnitude slower, so it is opt-in via `npm run test:int`.
 *
 * Prerequisite (the run fails with an explicit message if it is missing):
 *   docker compose --profile test up -d postgres_test
 *
 * @type {import('jest').Config}
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'test/.*\\.int-spec\\.ts$',
  transform: {
    // isolatedModules: type-checking the whole 230-file AppModule graph on every
    // boot took longer than the suite itself. Types are still enforced — by the
    // unit config, by `tsc --noEmit`, and by the editor. This transform only
    // needs to emit JS.
    '^.+\\.(t|j)s$': ['ts-jest', { isolatedModules: true }],
  },
  globalSetup: '<rootDir>/test/integration/setup/global-setup.ts',
  setupFiles: ['<rootDir>/test/integration/setup/env.ts'],
  testEnvironment: 'node',

  // One shared database, truncated and re-fixtured per run. Parallel workers
  // would race each other's fixture rows and produce flaky cross-tenant
  // results — the exact failure mode this suite exists to detect, which would
  // make a real leak indistinguishable from worker interference.
  maxWorkers: 1,

  // Real HTTP + real Postgres + a full Nest bootstrap per suite.
  testTimeout: 60_000,
};
