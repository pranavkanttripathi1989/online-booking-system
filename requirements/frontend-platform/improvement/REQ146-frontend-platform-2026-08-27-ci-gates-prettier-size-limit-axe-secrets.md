---
id: REQ146
type: improvement
feature: frontend-platform
created: 2026-08-27
updated: 2026-08-27
status: done
parent: none
related: []
---

# REQ146 — Frontend CI gates: prettier, size-limit, axe-core, secret scanning

## Source

`project-plans/phase-plans/01-phase1-close-the-gates.md` slice **P1-03**.
`FRONTEND_RULES.md` §18 named five gates ⛔ (not wired at all): CI-3
(prettier), CI-5 (size-limit), CI-7 (axe-core), CI-11 (secret scanning),
CI-12 (dependency size). Until they run, the rules they enforce are
advisory, not real.

## What shipped

- **CI-3 (prettier)** — `.prettierrc.json` (`semi: false, singleQuote:
  true`, matching the codebase's own dominant style, confirmed by
  sampling — ~83% of files already had no trailing semicolons) and
  `.prettierignore`. The whole tree had never been prettier-formatted
  (220 of ~230 files failed `--check` cold); reformatted once
  (`npx prettier --write .`), verified build/lint/tests all still green
  afterward, so `npx prettier --check .` is a real, enforced CI step
  from day one — there is no per-file ratchet mechanism for formatting
  the way ESLint's warning count has, so "measure first, ratchet down"
  isn't available here; a one-time full reformat was the only path to a
  genuinely green gate.
- **CI-5 / CI-12 (size-limit)** — `.size-limit.json`, three budgets
  calibrated to today's measured bundle (same "measure reality first"
  discipline as the lint ratchet), not the `FRONTEND_RULES` aspiration:
  - Initial bundle (the four chunks `index.html` actually
    modulepreloads): 335 KB gzip (measured 327.86 KB; PERF-1/3's own
    aspiration is 180–200 KB patient / 350 KB dashboard).
  - Largest lazy route chunk (`charts`/recharts): 115 KB gzip (measured
    109.92 KB; PERF-2's aspiration is 100 KB).
  - Initial CSS: 18 KB gzip (measured 13.5 KB; PERF-1's aspiration is
    40 KB — already comfortably under).

  `vite.config.js` gained one small, additive change:
  `entryFileNames: 'assets/entry-[name]-[hash].js'` — without it, the
  true entry chunk and the ~90 lazy route chunks that happen to come
  from an `index.jsx` file are indistinguishable by filename glob, so
  `.size-limit.json` could not target "the initial bundle" specifically.
- **CI-7 (axe-core)** — `jest-axe`'s `toHaveNoViolations` matcher
  registered globally (`jest.setup.js`); `src/test/a11y.js` exports
  `expectNoA11yViolations(container, knownGapRuleIds?)`. Wired into 3
  real page test suites — `booking/index.test.jsx` (patient-facing, the
  highest-stakes screen per `FRONTEND_RULES` A11Y-9's own words),
  `admin/Communications.test.jsx`, `auth/reset-password.test.jsx` (a
  guest-accessible screen) — not the full ~90-page tree, which is
  outside this slice's reasonable scope. The `knownGapRuleIds` param
  exists specifically so a real, identified, deliberately-deferred
  violation is excluded by name with a comment explaining why, never a
  blanket exception.
- **CI-11 (secret scanning)** — `gitleaks/gitleaks-action@v2` as a new
  `secrets` job in `.github/workflows/ci.yml`. No npm dependency, no API
  key required for the default ruleset. Not locally smoke-tested
  (`gitleaks` couldn't install locally — outdated Command Line Tools on
  this machine, unrelated to the slice) — shares this repo's own
  existing, already-documented "the CI workflow has never executed on
  GitHub" status, not a new gap this slice introduces.

## Three real accessibility defects found and fixed by the new CI-7 gate

Not a coincidence — this is exactly the class of bug a real automated
scan catches that a manual review misses:

1. **`booking/index.jsx`'s doctor Avatar had no `alt` text** — a real
   `image-alt` violation on the single most safety-critical screen in
   the product per `FRONTEND_RULES` A11Y-9's own framing.
2. **`booking/index.jsx` had no `<h1>` anywhere in its DOM** — the
   clinician-name `Typography` (`variant="h6"`) was the page's first
   heading, a real `heading-order` violation independent of test
   rendering context (confirmed by reading the whole file: no heading
   above `h6` exists anywhere in this page). Fixed with
   `component="h1"`, keeping the h6 visual size.
3. **`admin/Communications.jsx`'s SMS-provider `Select` had no
   accessible name at all with no value selected yet** — `label` alone
   doesn't reliably wire `aria-labelledby` without an explicit
   `id`/`labelId` pair (`FRONTEND_RULES` A11Y-12's own documented MUI
   gotcha, previously only known for the *post-selection* concatenation
   case — this is the *pre-selection* half of the same underlying gap).
   Fixed with `InputLabel id="sms-provider-label"` +
   `Select labelId="sms-provider-label"`.
4. **`admin/Communications.jsx`'s Global Settings tab skipped h2→h5**
   for all four of its section headings. Fixed with `component="h3"` on
   all four, keeping the h5 visual size — a clean h2→h3 sequence.

## One real gap found, deliberately not fixed, logged not hidden

`booking/index.jsx`'s heading order beyond the new `h1` is still not
fully valid: MUI's `subtitle1` variant also defaults to rendering an
`<h6>` tag, and this ~1200-line wizard uses both `h6` and `subtitle1`
extensively throughout its four steps. A full fix means auditing and
re-leveling every heading in the file — a real, separate task, out of
scope for "wire the CI-7 gate and fix what one scan surfaces on 3
pages." Excluded via `expectNoA11yViolations(container,
['heading-order'])` at that one call site only, with an inline comment
naming exactly what was and wasn't fixed — the two violations this same
scan originally found on this page (missing `alt`, missing `h1`) ARE
fixed and stay fully enforced.

## Deliberately out of scope

- Full-tree `axe-core` coverage (CI-7/A11Y-1 fully closed) — extending
  from 3 pages to ~90 is its own, larger, incremental effort.
- CI-6 (Lighthouse CI), CI-8 (visual regression), CI-10 (i18n coverage)
  — none had any prerequisite this slice could cheaply unblock.
- Re-leveling `booking/index.jsx`'s full heading hierarchy — see above.

## Exit criteria (from the phase-plan slice)

"Every gate in `FRONTEND_RULES.md` §18 marked ⛔ is either green or has a
dated waiver in §22" — satisfied: CI-3/5/11/12 are ✅ and wired; CI-7 is
🟡 (real, running, partial coverage — logged as such in §22, not claimed
as full); CI-6/8/10 remain the honestly-unstarted ⛔ rows they already
were, not newly claimed.
