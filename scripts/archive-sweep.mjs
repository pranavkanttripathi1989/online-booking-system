#!/usr/bin/env node
// Archive sweep for the five-root feature-scoped docs architecture.
//
// Rules (see CLAUDE.md "Project context" for the full contract):
//   - context/<feature>-<date>/ bundles archive when status is done|wont-do
//     AND date is 15+ days ago. Never archived at any other status/age.
//   - test-results/<feature>/<category>/*.md archive when 15+ days old AND
//     not the most recent result for their group. Grouping key: `parent`
//     when it's a real REQ###/IMPR###/BUG### id, otherwise `feature` — most
//     migrated docs still carry parent: unknown (no requirement docs exist
//     yet for most features), and grouping literally by the string
//     "unknown" would collapse nearly all test-results into one group and
//     archive all but the single globally-newest one, which defeats the
//     rule's own stated purpose (keeping current test coverage visible).
//   - requirements/, implementation-plans/, test-plans/, test-suggestions/
//     are never touched — living specs, age says nothing about currency.
//
// Usage: node scripts/archive-sweep.mjs [--apply]
// Default is dry run (prints planned moves only). --apply performs them.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, renameSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const REPO = path.resolve(new URL('.', import.meta.url).pathname, '..');
const APPLY = process.argv.includes('--apply');
const TODAY = new Date(); // system clock, never hardcoded
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysAgo(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return null;
  return Math.floor((TODAY - d) / MS_PER_DAY);
}

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let [, key, val] = kv;
    val = val.trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      fm[key] = val.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    } else if (val === 'null') {
      fm[key] = null;
    } else {
      fm[key] = val;
    }
  }
  return fm;
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (entry.endsWith('.md') && entry !== 'README.md') out.push(p);
  }
  return out;
}

function isRepoClean() {
  try {
    const out = execSync('git status --porcelain', { cwd: REPO }).toString();
    return out.trim() === '';
  } catch {
    return false;
  }
}

function moveFile(from, to, clean) {
  mkdirSync(path.dirname(to), { recursive: true });
  if (clean) {
    try {
      execSync(`git mv "${from}" "${to}"`, { cwd: REPO });
      return;
    } catch {
      // fall through to plain move if git mv fails for any reason
    }
  }
  renameSync(from, to);
}

const anomalies = [];
const planned = []; // { from, to, reason }
let skippedCount = 0;

// ── 1. context/ bundles ──────────────────────────────────────────────────
const contextDir = path.join(REPO, 'context');
if (existsSync(contextDir)) {
  for (const entry of readdirSync(contextDir)) {
    if (entry === 'archive' || entry === 'README.md') continue;
    const manifestPath = path.join(contextDir, entry, 'manifest.md');
    if (!existsSync(manifestPath)) continue;
    const fm = parseFrontmatter(readFileSync(manifestPath, 'utf8'));
    if (!fm) { anomalies.push(`context/${entry}: missing/unparseable frontmatter`); continue; }
    const age = daysAgo(fm.date);
    if (age === null) { anomalies.push(`context/${entry}: unparseable date "${fm.date}"`); continue; }
    if (!fm.status) { anomalies.push(`context/${entry}: missing status`); continue; }
    if (['done', 'wont-do'].includes(fm.status) && age >= 15) {
      planned.push({ from: path.join(contextDir, entry), to: path.join(contextDir, 'archive', entry), reason: `bundle done ${age}d ago`, kind: 'dir' });
    } else {
      skippedCount++;
    }
  }
}

// ── 2. test-results/ ─────────────────────────────────────────────────────
const testResultsDir = path.join(REPO, 'test-results');
const trFiles = walk(testResultsDir).filter(p => !p.includes(`${path.sep}_archive${path.sep}`));
const trEntries = trFiles.map(p => {
  const content = readFileSync(p, 'utf8');
  const fm = parseFrontmatter(content);
  return { path: p, fm, content };
}).filter(e => {
  if (!e.fm) { anomalies.push(`${path.relative(REPO, e.path)}: missing/unparseable frontmatter`); return false; }
  return true;
});

// group by real parent id if present, else by feature (see header comment)
const groups = {};
for (const e of trEntries) {
  const key = (e.fm.parent && e.fm.parent !== 'unknown') ? e.fm.parent : `feature:${e.fm.feature}`;
  groups[key] = groups[key] || [];
  groups[key].push(e);
}

for (const key of Object.keys(groups)) {
  const members = groups[key];
  members.sort((a, b) => (b.fm.updated || '').localeCompare(a.fm.updated || ''));
  const latest = members[0];
  for (const m of members) {
    const age = daysAgo(m.fm.updated);
    if (age === null) { anomalies.push(`${path.relative(REPO, m.path)}: unparseable updated date "${m.fm.updated}"`); continue; }
    if (m === latest) { skippedCount++; continue; } // always keep latest per group
    if (age >= 15) {
      const rel = path.relative(testResultsDir, m.path); // <feature>/<category>/<file>
      const to = path.join(testResultsDir, '_archive', rel);
      planned.push({ from: m.path, to, reason: `superseded, ${age}d old, not latest for ${key}`, kind: 'file' });
    } else {
      skippedCount++;
    }
  }
}

// ── report / apply ───────────────────────────────────────────────────────
const clean = isRepoClean();
let movedCount = 0;

if (planned.length === 0 && anomalies.length === 0) {
  process.exit(0); // nothing to do, no noise
}

for (const p of planned) {
  const fromRel = path.relative(REPO, p.from);
  const toRel = path.relative(REPO, p.to);
  console.log(`${APPLY ? 'MOVE' : 'WOULD MOVE'}  ${fromRel}  ->  ${toRel}  (${p.reason})`);
  if (APPLY) {
    if (p.kind === 'dir') {
      mkdirSync(path.dirname(p.to), { recursive: true });
      if (clean) {
        try { execSync(`git mv "${p.from}" "${p.to}"`, { cwd: REPO }); } catch { renameSync(p.from, p.to); }
      } else {
        renameSync(p.from, p.to);
      }
    } else {
      moveFile(p.from, p.to, clean);
    }
    movedCount++;
  }
}

if (APPLY && movedCount > 0) {
  try {
    execSync(`node "${path.join(REPO, 'scripts', 'rebuild-indexes.mjs')}"`, { cwd: REPO, stdio: 'inherit' });
  } catch (e) {
    anomalies.push(`index rebuild after apply failed: ${e.message}`);
  }
}

const summary = `archive-sweep: ${APPLY ? movedCount + ' moved' : planned.length + ' pending'}, ${skippedCount} skipped, ${anomalies.length} anomal${anomalies.length === 1 ? 'y' : 'ies'}${!clean ? ' (repo not clean — used plain move, not git mv)' : ''}`;
console.log(summary);
if (anomalies.length) anomalies.forEach(a => console.log('  anomaly: ' + a));
