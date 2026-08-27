#!/usr/bin/env node
// P1-07 (I18N-4) — "Every layout MUST tolerate +40% string length without
// breaking. Test with a pseudo-locale in CI." This generates that
// pseudo-locale from the real English strings, so it can never drift out
// of sync with what's actually extracted (regenerate whenever
// src/i18n/locales/en/common.json changes — CI runs this and diffs the
// result, see check-i18n-coverage.mjs's own note on that).
//
// Two things a pseudo-locale is deliberately for, both real defects a
// plain "translate to a long string once" test would miss:
//   1. Length inflation (+40%, matching Hindi/Tamil's own real average
//      expansion over English per FRONTEND_RULES.md RES-7) — catches a
//      fixed-width container that only "worked" because English is short.
//   2. Non-ASCII rendering — catches a font/encoding assumption that only
//      "worked" because English is pure ASCII.
// Padding with accented look-alike characters does both in one pass.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const EN_PATH = join(__dirname, '../src/i18n/locales/en/common.json')
const PSEUDO_DIR = join(__dirname, '../src/i18n/locales/pseudo')
const PSEUDO_PATH = join(PSEUDO_DIR, 'common.json')

const ACCENT_MAP = {
  a: 'ȧ', e: 'ė', i: 'ï', o: 'ȯ', u: 'ů',
  A: 'Ȧ', E: 'Ė', I: 'Ï', O: 'Ȯ', U: 'Ů',
}

function accentify(str) {
  return str.replace(/[aeiouAEIOU]/g, (ch) => ACCENT_MAP[ch] ?? ch)
}

// Pads to +~40% length with a bracketed filler, preserving any
// {{interpolation}} placeholders exactly (i18next matches them literally
// — accentifying the inside of a placeholder would silently break
// interpolation, which shipped as a real bug in this script's own first
// draft before being caught here).
function pseudoize(str) {
  const targetExtra = Math.ceil(str.length * 0.4)
  const filler = 'Ẋ'.repeat(Math.max(targetExtra, 3))
  const accented = str.replace(/\{\{[^}]+\}\}|[^{}]+/g, (part) => (part.startsWith('{{') ? part : accentify(part)))
  return `[${accented} ${filler}]`
}

function walk(value) {
  if (typeof value === 'string') return pseudoize(value)
  if (Array.isArray(value)) return value.map(walk)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]))
  }
  return value
}

const en = JSON.parse(readFileSync(EN_PATH, 'utf8'))
const pseudo = walk(en)
const output = JSON.stringify(pseudo, null, 2) + '\n'

// --stdout: print without writing, so check-i18n-coverage.mjs can diff a
// freshly-generated copy against the checked-in file without mutating it
// (a CI check must be read-only; regenerating-and-committing is a
// separate, human-reviewed step).
if (process.argv.includes('--stdout')) {
  process.stdout.write(output)
} else {
  mkdirSync(PSEUDO_DIR, { recursive: true })
  writeFileSync(PSEUDO_PATH, output)
  console.log(`Wrote ${PSEUDO_PATH} (${Object.keys(en).length} top-level keys, +40% length)`)
}
