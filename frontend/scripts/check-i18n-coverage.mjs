#!/usr/bin/env node
/**
 * P1-07 (I18N-10, CI-10) — "A missing translation falls back to English
 * visibly in dev [...] and silently in prod. CI reports coverage per
 * language." i18next's own runtime fallback (partialBundledLanguages,
 * see i18n/config.js) means a missing Hindi key never crashes or shows a
 * raw key to a real user — it just silently shows English. That's the
 * correct RUNTIME behaviour and exactly why this needs a separate BUILD-TIME
 * gate: the runtime fallback is what makes a missing translation invisible
 * to normal QA, not just to users.
 *
 * Fails if:
 *   - a key exists in the English source but is missing from a real
 *     (non-pseudo) target language file — an untranslated string.
 *   - a key exists in a target language file but not in English — dead
 *     translation debt (usually a stale key left behind after an English
 *     string was renamed or removed).
 *   - the checked-in pseudo-locale file is stale relative to the real
 *     English source (regenerate via `node scripts/generate-pseudo-locale.mjs`
 *     and commit the result — this script does not run the generator
 *     itself, to keep CI read-only and the generated file's diff visible
 *     in code review like any other change).
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOCALES_DIR = join(__dirname, '../src/i18n/locales')
const SOURCE_LANGUAGE = 'en'
const TARGET_LANGUAGES = ['hi', 'ta', 'bn', 'mr', 'te', 'kn', 'gu'] // real, user-facing languages only — 'pseudo' is checked separately below

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function flattenKeys(obj, prefix = '') {
  const keys = []
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) keys.push(...flattenKeys(v, path))
    else keys.push(path)
  }
  return keys
}

let failed = false

const sourcePath = join(LOCALES_DIR, SOURCE_LANGUAGE, 'common.json')
const sourceKeys = new Set(flattenKeys(loadJson(sourcePath)))

for (const lang of TARGET_LANGUAGES) {
  const targetPath = join(LOCALES_DIR, lang, 'common.json')
  const targetKeys = new Set(flattenKeys(loadJson(targetPath)))

  const missing = [...sourceKeys].filter((k) => !targetKeys.has(k))
  const extra = [...targetKeys].filter((k) => !sourceKeys.has(k))

  if (missing.length > 0) {
    failed = true
    console.error(`✖ ${lang}/common.json is missing ${missing.length} key(s) present in English:`)
    missing.forEach((k) => console.error(`    ${k}`))
  }
  if (extra.length > 0) {
    failed = true
    console.error(`✖ ${lang}/common.json has ${extra.length} key(s) not present in English (dead translation debt):`)
    extra.forEach((k) => console.error(`    ${k}`))
  }
  if (missing.length === 0 && extra.length === 0) {
    console.log(`✓ ${lang}/common.json: ${targetKeys.size}/${sourceKeys.size} keys, fully covered`)
  }
}

// Pseudo-locale staleness check — regenerate into a temp copy and diff
// against the checked-in one, rather than re-deriving key-by-key here.
try {
  const checkedIn = readFileSync(join(LOCALES_DIR, 'pseudo/common.json'), 'utf8')
  const freshOutput = execSync('node scripts/generate-pseudo-locale.mjs --stdout', { cwd: join(__dirname, '..'), encoding: 'utf8' })
  if (freshOutput.trim() && freshOutput.trim() !== checkedIn.trim()) {
    failed = true
    console.error('✖ src/i18n/locales/pseudo/common.json is stale — regenerate with `node scripts/generate-pseudo-locale.mjs` and commit it.')
  } else {
    console.log('✓ pseudo/common.json is up to date with the real English source')
  }
} catch (e) {
  failed = true
  console.error('✖ Could not verify the pseudo-locale is current:', e.message)
}

if (failed) {
  console.error('\ni18n coverage check failed — see above.')
  process.exit(1)
}
console.log('\ni18n coverage check passed.')
