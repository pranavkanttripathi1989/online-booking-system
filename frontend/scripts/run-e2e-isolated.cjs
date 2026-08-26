#!/usr/bin/env node
// Runs Playwright against the isolated e2e stack (project-plans/06-execution-plan.md
// P1.5, F-28) instead of the shared dev stack. Sets env vars via process.env
// rather than shell syntax (`VAR=val cmd`) so this works unchanged on
// PowerShell, cmd, and bash -- avoids adding a cross-env-style dependency
// just for this.
//
// Prerequisite: docker compose --profile e2e up -d --force-recreate
const { spawnSync } = require('child_process')

process.env.E2E_BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3101'
process.env.E2E_GRAPHQL_URL = process.env.E2E_GRAPHQL_URL || 'http://localhost:4001/graphql'
// clinician-portal.spec.js reaches into the Postgres container directly for
// one setup step (linking a demo account to the fixture clinician) -- point
// it at the e2e container/database instead of the dev one it defaults to.
process.env.E2E_DB_CONTAINER = process.env.E2E_DB_CONTAINER || 'medibook_postgres_e2e'
process.env.E2E_DB_NAME = process.env.E2E_DB_NAME || 'medibook_e2e'

// The isolated stack is still a SINGLE Vite dev server + a SINGLE backend
// process, same as the shared dev stack. Measured: even --workers=4 left
// 50/66 tests failing on the same page.goto/waitForURL timeout pattern --
// not browser resource contention, but the login mutation's own
// @Throttle({limit:5, ttl:60_000}) guard (confirmed the same shape of
// flakiness earlier the same session against the dev stack). --workers=1
// (fully serial) is the one setting already proven reliable there; it costs
// wall-clock time, not correctness.
const extraArgs = process.argv.slice(2)
const hasWorkerFlag = extraArgs.some((a) => a.startsWith('--workers'))
const args = ['playwright', 'test', ...extraArgs, ...(hasWorkerFlag ? [] : ['--workers=1'])]

const result = spawnSync('npx', args, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
})

process.exit(result.status ?? 1)
