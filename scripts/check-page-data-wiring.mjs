#!/usr/bin/env node
/**
 * Structural gate for fabricated-data pages (F-18 / F-26).
 *
 * technical-plans/00-foundation-hardening.md §6 asks for "one structural gate
 * that grep-based audits structurally cannot do: fail if a file under
 * frontend/src/pages renders a list/detail view with no GraphQL operation
 * reference."
 *
 * The reason a grep cannot do this is on record. Four separate audits swept for
 * `mocks/store` imports and each walked straight past
 * `components/shared/NotificationBell.jsx` and `pages/clinicians/detail.jsx`,
 * because neither imported the mock store — one used a `useMockData()` hook and
 * the other simply hardcoded a `MOCK_CLINICIAN` object. The defect is not "imports
 * the mock store"; it is "renders data-shaped UI while talking to nothing".
 *
 * So this asks the inverse question: does a file that clearly renders data have
 * any route to real data at all?
 *
 * Deliberately conservative. It reports only files that render data-shaped UI
 * AND have no GraphQL reference of any kind AND no props/context/router source
 * that could plausibly supply the data. A presentational component handed rows
 * by its parent is not a finding, and treating it as one would get this gate
 * disabled within a week.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const PAGES = join(ROOT, 'frontend', 'src', 'pages');

/** Renders something that displays a collection or a record. */
const DATA_UI = [
  /<DataGrid\b/, /<Table\b/, /<TableBody\b/, /<List\b/, /<Timeline\b/,
  /\.map\s*\(\s*\(?\s*\w+\s*(,|\)|=)/,
];

/** Any route to real server data. */
const REAL_DATA = [
  /\buseQuery\b/, /\buseLazyQuery\b/, /\buseMutation\b/, /\buseSubscription\b/,
  /\bgql`/, /from\s+['"].*graphql\/(queries|mutations|subscriptions)/,
  /\buseApolloClient\b/, /\bclient\.query\b/, /\bfetch\s*\(/, /\baxios\b/,
];

/** Data can legitimately arrive from somewhere other than a query. */
const EXTERNAL_SOURCE = [
  /\bprops\b/, /\buseContext\b/, /\buseAuth\b/, /\buseParams\b/,
  /\buseLocation\b/, /\buseOutletContext\b/, /\buseSelector\b/,
  /^\s*export\s+default\s+function\s+\w+\s*\(\s*\{/m, // destructured props
];

/**
 * Pages that render fabricated data today.
 *
 * Listed explicitly so the gate passes on the current tree while keeping every
 * instance visible, and so that a NEW fabricated page fails the build. Delete
 * an entry when the page is wired; the gate prints a note when an entry here no
 * longer looks fabricated, so the list cannot go stale in the other direction.
 *
 * Two very different groups, and the distinction is the whole point:
 */
const ALLOWED = new Set([
  // No backend domain exists yet, so there is nothing to wire these to.
  // Building the domains is CLAUDE.md Priority 2. Fabricated data here is a
  // known gap, not a regression.
  'onboarding/index.jsx',
  'tasks/index.jsx',
  'waiting-room/index.jsx',

  // The seven pages that were here — analytics, clinician/Patients,
  // manager/Billing, patient/Appointments, public/landing, staff/Appointments
  // and staff/Dashboard — are gone from this list because they are wired
  // (BUG009). manager/Billing was deleted outright: it duplicated /finances.
]);


function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.jsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const findings = [];
for (const file of walk(PAGES)) {
  const src = readFileSync(file, 'utf8');
  const rel = relative(PAGES, file).split('\\').join('/');

  const rendersData = DATA_UI.some((re) => re.test(src));
  if (!rendersData) continue;

  const hasRealData = REAL_DATA.some((re) => re.test(src));
  if (hasRealData) continue;

  const hasExternalSource = EXTERNAL_SOURCE.some((re) => re.test(src));
  if (hasExternalSource) continue;

  findings.push(rel);
}

const unexpected = findings.filter((f) => !ALLOWED.has(f));
const stale = [...ALLOWED].filter((a) => !findings.includes(a));

if (stale.length) {
  console.log(
    `note: ${stale.length} allowlisted page(s) no longer look fabricated — ` +
      `remove them from ALLOWED in scripts/check-page-data-wiring.mjs:\n  ` +
      stale.join('\n  '),
  );
}

if (unexpected.length) {
  console.error(
    `\n✖ ${unexpected.length} page(s) render data-shaped UI with no route to real data:\n  ` +
      unexpected.join('\n  ') +
      `\n\nEither wire the page to its GraphQL operation, or — if the domain genuinely\n` +
      `does not exist yet — add it to ALLOWED in scripts/check-page-data-wiring.mjs\n` +
      `with a note, so it stays visible instead of silently shipping fake data.\n`,
  );
  process.exit(1);
}

console.log(`✓ page data-wiring gate: ${findings.length} known-fabricated, 0 new`);
