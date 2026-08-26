---
id: CTX-frontend-platform-2026-08-27-req146
type: improvement
feature: frontend-platform
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ146
related: [PLAN186, TP206, TR206]
---

# frontend-platform — CI gates: prettier, size-limit, axe-core, secrets (2026-08-27)

Slice **P1-03**, third slice of Phase 1
(`project-plans/phase-plans/01-phase1-close-the-gates.md`). Wired five
previously-⛔ `FRONTEND_RULES.md` §18 gates: CI-3 (prettier), CI-5
(size-limit), CI-7 (axe-core), CI-11 (secret scanning), CI-12
(dependency size, via size-limit).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ146 | [Frontend CI gates](../../requirements/frontend-platform/improvement/REQ146-frontend-platform-2026-08-27-ci-gates-prettier-size-limit-axe-secrets.md) |
| implementation-plans | PLAN186 | [implementation plan](../../implementation-plans/frontend-platform/improvement/PLAN186-frontend-platform-2026-08-27-ci-gates-prettier-size-limit-axe-secrets.md) |
| test-plans | TP206 | [test plan](../../test-plans/frontend-platform/improvement/TP206-frontend-platform-2026-08-27-ci-gates-prettier-size-limit-axe-secrets.md) |
| test-results | TR206 | [results](../../test-results/frontend-platform/improvement/TR206-frontend-platform-2026-08-27-ci-gates-prettier-size-limit-axe-secrets.md) |

## What shipped

- `.prettierrc.json`/`.prettierignore`, whole tree reformatted once
  (220 files), `npx prettier --check .` now a real CI gate.
- `.size-limit.json`, three budgets calibrated to today's measured
  bundle (not the `FRONTEND_RULES` aspiration) — initial bundle
  335 KB / largest lazy chunk 115 KB / initial CSS 18 KB gzipped.
  `vite.config.js` gained a one-line `entryFileNames` change so the
  true entry chunk is glob-able separately from ~90 lazy `index-*.js`
  route chunks.
- `jest-axe` wired globally (`jest.setup.js`); `src/test/a11y.js`'s
  `expectNoA11yViolations()` used in 3 real page suites.
- `gitleaks/gitleaks-action@v2` as a new `secrets` job in
  `.github/workflows/ci.yml`.
- `FRONTEND_RULES.md` §18/§22 and
  `technical-plans/07-frontend-rules-compliance.md` updated to reflect
  the newly-wired gates, including the honest "3 of ~90 pages" scope of
  the axe-core coverage — not claimed as full.

## Real bugs found and fixed by the new axe-core gate

Four, across two of the three new suites (the third, reset-password,
was already clean):

1. `booking/index.jsx`'s doctor Avatar had no `alt` text.
2. `booking/index.jsx` had **no `<h1>` anywhere in its DOM** — its first
   heading was an `<h6>`. Fixed with `component="h1"`, one deliberately
   NOT-fixed gap logged (the page's deeper heading order, MUI's
   `subtitle1` variant also defaulting to `<h6>`).
3. `admin/Communications.jsx`'s SMS-provider `Select` had no accessible
   name at all before a value was selected — `label` alone doesn't
   reliably wire `aria-labelledby` without an explicit `id`/`labelId`
   pair.
4. `admin/Communications.jsx`'s Global Settings tab skipped h2→h5 across
   four section headings — fixed with `component="h3"` on all four.

## Live verification

`npx prettier --check .`, `npm run size`, `npm run lint`, `npm run
build` all green. Full frontend suite: 30 suites, 205/208 tests green;
3 suites failed on a full-parallel run, all 3 confirmed pre-existing or
contention-only (one, `booking/index.test.jsx`, re-ran 8/8 green in
isolation — the other two were already-documented flakes predating this
slice). `gitleaks` itself was not locally smoke-tested (Homebrew
install blocked by outdated Xcode Command Line Tools on this machine,
unrelated to the slice) — shares this repo's pre-existing "CI has never
executed on GitHub" status.
