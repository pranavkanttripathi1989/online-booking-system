---
id: PLAN214
type: improvement
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: done
parent: REQ161
related: [TP234, TR234]
---

# PLAN214 — six more regional languages (P2-09)

## Approach

Pure extension of `REQ150`'s (`P1-07`) existing mechanism — no new
i18n infrastructure needed:

1. Read the current, exact `frontend/src/i18n/locales/en/common.json`
   source (64 keys across `languageSwitcher`, `layout` incl. `nav`/
   `footer` arrays, `booking` incl. `steps`, `prescription` incl.
   `frequencyCode`) to translate faithfully.
2. Write six new locale files mirroring that exact key structure:
   `locales/{ta,bn,mr,te,kn,gu}/common.json`.
3. Extend `i18n/config.js`'s `SUPPORTED_LANGUAGES` (native labels) and
   `localeLoaders` (six new lazy `import()`s, matching the existing
   per-language dynamic-import pattern — no bundling-all-languages
   violation, I18N-8).
4. Regenerate the pseudo-locale (`node scripts/generate-pseudo-
   locale.mjs`) so its own staleness check stays accurate.
5. Fix a real, pre-existing gap found while implementing: `scripts/
   check-i18n-coverage.mjs`'s `TARGET_LANGUAGES` was hardcoded to
   `['hi']` only — meaning CI coverage checking silently never covered
   any future added language until manually added here. Extended to
   include all 6 new codes.
6. Audit (via `Explore` agent) for any other hardcoded "2 languages"
   assumption elsewhere in the codebase before declaring done — see
   `REQ161`'s own account of what was checked and found safe.

## Deliberately not touched

`PrescriptionBuilder.jsx`'s `PRESCRIPTION_LANGUAGES` constant stays
`en`/`hi` — confirmed a genuinely separate array (not an accidental
alias of `SUPPORTED_LANGUAGES`), scoped to the backend PDF renderer's
font support (`REQ160`/`P2-08`). Widening it is a separate, larger,
backend-touching slice.

## Testing

- `npm run i18n:coverage` — all 6 new bundles report 64/64 keys, full
  parity; pseudo-locale confirmed not stale.
- `npx eslint src/App.jsx src/i18n/config.js scripts/check-i18n-
  coverage.mjs` — clean.
- `npm run build` — succeeds; `npm run size` — all three budgets still
  green (initial bundle 329 kB / 350 kB limit).
- Full `npx jest` — green (see `TR234`).

## Commit

One commit for the six locale files + config wiring + the coverage-
script fix, documented together since they're one indivisible slice.
