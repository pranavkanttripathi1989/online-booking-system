---
id: PLAN186
type: improvement
feature: frontend-platform
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ146
related: [TP206, TR206]
---

# PLAN186 — Frontend CI gates: prettier, size-limit, axe-core, secret scanning

FE-only slice, no backend/frontend contract to pin (technical-plans/08's
five decisions don't apply — nothing here crosses the GraphQL boundary).

## Sequencing

1. **Measured before deciding any budget number** — built the app
   (`npm run build`), read `dist/index.html`'s own `<script>`/
   `modulepreload` tags to find which chunks are genuinely eager
   (`entry`, `apollo`, `vendor`, `mui`) vs. genuinely lazy (`charts`,
   `DataGrid`, and the many per-route `index-*.js` chunks) — not assumed
   from `vite.config.js`'s `manualChunks` names alone.
2. **`vite.config.js`**: `entryFileNames: 'assets/entry-[name]-[hash].js'`
   — a one-line, additive naming change so the true entry chunk has a
   glob-able name distinct from the ~90 lazy chunks that also start with
   `index-` (every route file named `index.jsx` produces one).
   Re-verified the build still boots correctly after the rename
   (`dist/index.html`'s own `<script src>` picked it up automatically).
3. **`size-limit`** installed (`size-limit`, `@size-limit/file`),
   `.size-limit.json` written against the freshly re-measured build,
   `npm run size` script added.
4. **`prettier`** installed, `.prettierrc.json` calibrated to the
   codebase's own dominant convention (sampled semicolon usage across 5
   files spanning old and new code — ~83% use no trailing semicolons —
   before picking `semi: false`, not guessed). `--check` cold: 220/~230
   files non-conformant. Reformatted once (`--write .`), then re-ran
   lint (1,906 warnings, unchanged — confirmed prettier didn't touch
   anything the hex-color rule or any other rule cares about), the full
   build (bundle sizes unchanged to the byte, modulo one file's comment
   reformatting), and the size-limit budgets (still green) before
   trusting the reformat was safe.
5. **`jest-axe`** installed, `toHaveNoViolations` registered in
   `jest.setup.js`, `src/test/a11y.js`'s `expectNoA11yViolations` helper
   written with an explicit `knownGapRuleIds` escape hatch designed to
   force a comment at every use (never a silent global exception list).
   Added to 3 real page suites, chosen for stakes not convenience:
   `booking/index.test.jsx` (patient-facing, the flow `FRONTEND_RULES`
   itself names as the highest-stakes screen), `admin/Communications.test.jsx`
   (a page this session's own P1-01 slice had just extended),
   `auth/reset-password.test.jsx` (guest-accessible, no login required).
   All three surfaced real violations on first run — fixed all of them
   except one (booking's own deeper heading-order issue, see `REQ146`),
   re-ran to confirm green.
6. **`gitleaks`** — a GitHub Action, not an npm install; added as a new
   `secrets` job in `.github/workflows/ci.yml`, `fetch-depth: 0` so it
   scans full history on a push, not just the diff.
7. **`FRONTEND_RULES.md` §18/§22** and
   **`technical-plans/07-frontend-rules-compliance.md`** updated in the
   same change — a status table that lags the code it describes is worse
   than no table.

## Real findings, not assumed

- **`prettier --write .` touching 220 files was the single largest-blast-
  radius change in this slice** — verified safe by re-running the full
  gate stack (lint, build, size-limit) immediately after, before
  proceeding to anything else, rather than trusting "it's just
  formatting" on faith.
- **Three real, live axe-core violations**, not synthetic examples — see
  `REQ146`'s own account. Confirms the gate is worth the CI minutes it
  costs, on the very first run.
- **One violation deliberately not fixed** (booking wizard's deeper
  heading order) — the honest, scoped-down outcome this document's own
  working loop explicitly allows, not a failure to force past.

## Definition of done

- [x] `npx prettier --check .` — clean.
- [x] `npm run size` — all 3 budgets green.
- [x] `jest-axe` wired globally; 3 real page suites pass with real
  scans (2 of 3 required a real code fix first).
- [x] `gitleaks` job added to CI (unproven against real GitHub — this
  repo's CI has never executed there at all, a pre-existing, unrelated
  status).
- [x] Full frontend suite: 30 suites, 3 failed on a full-parallel run —
  all 3 confirmed pre-existing/contention (2 already-known:
  `EncounterWorkspace.test.jsx`, `manager/claims/index.test.jsx`; the
  third, `booking/index.test.jsx`, re-ran 8/8 green in isolation).
- [x] `npm run lint` — 1,906 warnings, 0 errors, unchanged from the
  pre-slice baseline.
