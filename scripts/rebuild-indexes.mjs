#!/usr/bin/env node
// Rebuilds every index in the five-root docs architecture from the frontmatter
// actually present in each file — never from a cached registry. Run this any
// time a document is added, moved, or its frontmatter changes. archive-sweep.mjs
// calls this automatically after --apply.
//
// Regenerates:
//   <root>/<feature>/README.md   (per feature, per root)
//   <root>/README.md             (per root)
//   context/README.md            (active bundles + preserves existing reference content)
//   context/archive/README.md    (archived bundles)
//
// Usage: node scripts/rebuild-indexes.mjs

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import path from 'path';

const REPO = path.resolve(new URL('.', import.meta.url).pathname, '..');
const ROOTS = ['requirements', 'implementation-plans', 'test-plans', 'test-results', 'test-suggestions'];

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

function titleOf(content) {
  const m = content.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : '(untitled)';
}

function walkDocs(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (entry === '_archive') continue; // archived test-results aren't in the active index
      out.push(...walkDocs(p));
    } else if (entry.endsWith('.md') && entry !== 'README.md') {
      out.push(p);
    }
  }
  return out;
}

// ── gather every doc across the five roots ──────────────────────────────
const registry = [];
const anomalies = [];
for (const root of ROOTS) {
  const rootDir = path.join(REPO, root);
  for (const filePath of walkDocs(rootDir)) {
    const content = readFileSync(filePath, 'utf8');
    const fm = parseFrontmatter(content);
    const relPath = path.relative(REPO, filePath);
    if (!fm) { anomalies.push(`${relPath}: missing/unparseable frontmatter, excluded from indexes`); continue; }
    const rel = path.relative(rootDir, filePath); // <feature>/<category>/<file>
    const [feature, category] = rel.split(path.sep);
    if (!['requirement', 'improvement', 'bug'].includes(category)) {
      anomalies.push(`${relPath}: not under a requirement/improvement/bug category dir, excluded`);
      continue;
    }
    registry.push({ ...fm, root, feature, category, relPath, title: titleOf(content) });
  }
}

// ── per-feature README ────────────────────────────────────────────────────
const byRootFeature = {};
for (const e of registry) {
  byRootFeature[e.root] = byRootFeature[e.root] || {};
  byRootFeature[e.root][e.feature] = byRootFeature[e.root][e.feature] || [];
  byRootFeature[e.root][e.feature].push(e);
}

for (const root of ROOTS) {
  const features = byRootFeature[root] || {};
  for (const feature of Object.keys(features)) {
    const docs = features[feature];
    const byCategory = { requirement: [], improvement: [], bug: [] };
    for (const d of docs) byCategory[d.category]?.push(d);
    for (const cat of Object.keys(byCategory)) byCategory[cat].sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));

    let body = `# ${feature}\n\n`;
    for (const cat of ['requirement', 'improvement', 'bug']) {
      const rows = byCategory[cat];
      body += `## ${cat}\n\n`;
      if (!rows.length) { body += `_none yet_\n\n`; continue; }
      body += `| ID | Type | Title | Status | Created | Updated | Parent | Link |\n|---|---|---|---|---|---|---|---|\n`;
      for (const d of rows) {
        const filename = path.basename(d.relPath);
        body += `| ${d.id} | ${d.type} | ${d.title} | ${d.status} | ${d.created} | ${d.updated} | ${d.parent === null ? '—' : d.parent} | [${filename}](./${cat}/${filename}) |\n`;
      }
      body += '\n';
    }
    mkdirSync(path.join(REPO, root, feature), { recursive: true });
    writeFileSync(path.join(REPO, root, feature, 'README.md'), body);
  }
}

// ── root README ────────────────────────────────────────────────────────────
for (const root of ROOTS) {
  const features = byRootFeature[root] || {};
  const rows = Object.keys(features).map(feature => {
    const docs = features[feature];
    const counts = { requirement: 0, improvement: 0, bug: 0 };
    for (const d of docs) counts[d.category] = (counts[d.category] || 0) + 1;
    const openCount = docs.filter(d => !['done', 'wont-do'].includes(d.status)).length;
    const doneCount = docs.filter(d => ['done', 'wont-do'].includes(d.status)).length;
    const mostRecent = docs.reduce((max, d) => (d.updated || '') > max ? d.updated : max, '0000-00-00');
    return { feature, counts, openCount, doneCount, mostRecent };
  }).sort((a, b) => b.mostRecent.localeCompare(a.mostRecent));

  let body = `# ${root}\n\n| Feature | Requirement | Improvement | Bug | Open | Done | Most recent | Link |\n|---|---|---|---|---|---|---|---|\n`;
  for (const r of rows) {
    body += `| ${r.feature} | ${r.counts.requirement} | ${r.counts.improvement} | ${r.counts.bug} | ${r.openCount} | ${r.doneCount} | ${r.mostRecent} | [${r.feature}](./${r.feature}/README.md) |\n`;
  }
  writeFileSync(path.join(REPO, root, 'README.md'), body);
}

// ── context/ bundles (active) ────────────────────────────────────────────
const contextDir = path.join(REPO, 'context');
const bundleRows = [];
if (existsSync(contextDir)) {
  for (const entry of readdirSync(contextDir)) {
    if (entry === 'archive' || entry === 'README.md') continue;
    const manifestPath = path.join(contextDir, entry, 'manifest.md');
    if (!existsSync(manifestPath)) continue;
    const fm = parseFrontmatter(readFileSync(manifestPath, 'utf8'));
    if (!fm) { anomalies.push(`context/${entry}/manifest.md: missing/unparseable frontmatter`); continue; }
    bundleRows.push({ dir: entry, ...fm });
  }
}

let activeIdx = `# context/ — active bundles\n\nOne bundle per feature, linking every doc across the five roots for that feature. See \`archive/README.md\` for aged-out bundles.\n\n`;
activeIdx += `| Bundle | Feature | Date | IDs | Status | Link |\n|---|---|---|---|---|---|\n`;
for (const b of bundleRows.sort((a, b) => (b.date || '').localeCompare(a.date || ''))) {
  const ids = Array.isArray(b.ids) ? b.ids.join(', ') : (b.ids || '');
  activeIdx += `| ${b.dir} | ${b.feature} | ${b.date} | ${ids} | ${b.status} | [manifest.md](./${b.dir}/manifest.md) |\n`;
}

// preserve any existing non-index content in context/README.md below a "---" separator
const existingReadmePath = path.join(contextDir, 'README.md');
let preserved = '';
if (existsSync(existingReadmePath)) {
  const existing = readFileSync(existingReadmePath, 'utf8');
  const sepIdx = existing.indexOf('\n---\n\n');
  preserved = sepIdx !== -1 ? existing.slice(sepIdx) : '';
}
writeFileSync(existingReadmePath, activeIdx + (preserved || '\n---\n\n'));

// ── context/archive/ (archived bundles) ──────────────────────────────────
const archiveDir = path.join(contextDir, 'archive');
mkdirSync(archiveDir, { recursive: true });
const archivedRows = [];
for (const entry of readdirSync(archiveDir)) {
  if (entry === 'README.md') continue;
  const manifestPath = path.join(archiveDir, entry, 'manifest.md');
  if (!existsSync(manifestPath)) continue;
  const fm = parseFrontmatter(readFileSync(manifestPath, 'utf8'));
  if (fm) archivedRows.push({ dir: entry, ...fm });
}
let archiveIdx = `# context/archive — archived bundles\n\nPopulated by \`scripts/archive-sweep.mjs\`.\n\n| Bundle | Feature | Date | IDs | Status | Link |\n|---|---|---|---|---|---|\n`;
for (const b of archivedRows.sort((a, b) => (b.date || '').localeCompare(a.date || ''))) {
  const ids = Array.isArray(b.ids) ? b.ids.join(', ') : (b.ids || '');
  archiveIdx += `| ${b.dir} | ${b.feature} | ${b.date} | ${ids} | ${b.status} | [manifest.md](./${b.dir}/manifest.md) |\n`;
}
writeFileSync(path.join(archiveDir, 'README.md'), archiveIdx);

console.log(`Indexes rebuilt: ${registry.length} docs across ${ROOTS.length} roots, ${bundleRows.length} active bundles, ${archivedRows.length} archived bundles.`);
if (anomalies.length) {
  console.log(`${anomalies.length} anomalies:`);
  anomalies.forEach(a => console.log('  ' + a));
}
