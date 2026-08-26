#!/usr/bin/env node
/**
 * REQ123 (repo-hygiene) — a CI-measured source of truth for backend
 * suite/test counts, so CLAUDE.md can link here instead of a hand-edited
 * number that goes stale the moment the next slice adds a test file.
 *
 * CLAUDE.md's own text admits this repeatedly ("the older '405/405, 37
 * suites' figure recorded here was stale by two sessions — verify this
 * count against a real run rather than trusting it", and similar notes
 * on at least four other counts across the file). A hand-typed number in
 * prose can never keep up with a codebase that gains new `.spec.ts`
 * files every session; a script that actually runs the suite and reports
 * what it measured can.
 *
 * Usage:
 *   node scripts/test-count-status.mjs              # backend unit only (fast, ~45s)
 *   node scripts/test-count-status.mjs --integration # also runs the integration
 *                                                     # suite (needs postgres_test
 *                                                     # already up — this script does
 *                                                     # not start it for you, since
 *                                                     # that's a real Docker action)
 *
 * Prints a short, copy-pasteable status block. Does not write any file —
 * the whole point is that a stale *paste* of this output is easy to spot
 * as stale (it says a date), where a stale hand-typed number gives no
 * such signal.
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { join } from 'path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BACKEND = join(ROOT, 'backend');
const runIntegration = process.argv.includes('--integration');

function runJestJson(args, cwd) {
  const result = spawnSync('npx', ['jest', ...args, '--json', '--silent'], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
  });
  // jest writes its --json summary to stdout even on a failing run (some
  // suites red) -- only a genuinely unparseable stdout (jest itself
  // crashed before finishing) should be treated as "couldn't measure".
  const stdout = result.stdout ?? '';
  const jsonStart = stdout.indexOf('{');
  if (jsonStart === -1) {
    return { error: result.stderr || 'jest produced no JSON output', exitCode: result.status };
  }
  try {
    const parsed = JSON.parse(stdout.slice(jsonStart));
    return { parsed, exitCode: result.status };
  } catch (e) {
    return { error: `Failed to parse jest --json output: ${e.message}`, exitCode: result.status };
  }
}

function summarize(label, { parsed, error, exitCode }) {
  if (error || !parsed) {
    console.log(`${label}: could not measure (${error ?? `exit ${exitCode}`})`);
    return;
  }
  const {
    numTotalTestSuites, numPassedTestSuites,
    numTotalTests, numPassedTests,
  } = parsed;
  const suitesOk = numPassedTestSuites === numTotalTestSuites;
  const testsOk = numPassedTests === numTotalTests;
  const status = suitesOk && testsOk ? 'green' : 'RED — see jest output above';
  console.log(`${label}: ${numPassedTestSuites}/${numTotalTestSuites} suites, ${numPassedTests}/${numTotalTests} tests — ${status}`);
}

console.log(`Measured ${new Date().toISOString()} on ${process.platform}, node ${process.version}\n`);

console.log('Running backend unit suite (npx jest --maxWorkers=2)...');
const unit = runJestJson(['--maxWorkers=2'], BACKEND);
summarize('Backend unit', unit);

if (runIntegration) {
  console.log('\nRunning backend integration suite (jest.integration.config.js)...');
  const integration = runJestJson(['--config', 'jest.integration.config.js', '--runInBand'], BACKEND);
  summarize('Backend integration', integration);
} else {
  console.log('\nBackend integration: skipped (pass --integration; requires `docker compose --profile test up -d postgres_test` first)');
}

console.log('\nPaste the lines above wherever CLAUDE.md currently names a specific');
console.log('suite/test count — they carry their own measurement date, so a stale');
console.log('paste is self-evident in a way a bare number never is.');
