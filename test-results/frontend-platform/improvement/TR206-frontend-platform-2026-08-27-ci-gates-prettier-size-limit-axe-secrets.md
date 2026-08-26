---
id: TR206
type: improvement
feature: frontend-platform
created: 2026-08-27
updated: 2026-08-27
status: pass
parent: TP206
related: [REQ146, PLAN186]
---

# TR206 — Results: frontend CI gates

## Static/tooling checks

- `npx prettier --check .`: **clean** (220/230 files reformatted once;
  re-checked clean afterward).
- `npm run size`: **all 3 budgets pass** — initial bundle 327.86/335 KB,
  largest lazy chunk (charts) 109.92/115 KB, initial CSS 13.5/18 KB
  (gzipped).
- `npm run lint`: **1,906 warnings, 0 errors** — identical to the
  pre-reformat baseline; the mass prettier reformat did not disturb any
  lint-tracked pattern.
- `npm run build`: succeeds; bundle byte sizes unchanged to within a
  handful of bytes (comment reformatting only).
- `.github/workflows/ci.yml`: YAML syntax validated (`ruby -ryaml`, no
  `pyyaml`/`gitleaks` available locally to fully dry-run the new
  `secrets` job — matches this repo's own pre-existing "CI has never
  executed on GitHub" status, not a new gap).

## Real a11y findings (the point of wiring CI-7)

All three confirmed **failing** on first run, **passing** after the
corresponding source fix (not after loosening the check):

1. `booking/index.test.jsx` — `image-alt` (doctor avatar, no `alt`) and
   `heading-order` (no `<h1>` anywhere in the page). Both fixed.
2. `admin/Communications.test.jsx` — `aria-input-field-name` (SMS
   provider `Select`, no accessible name pre-selection) and
   `heading-order` (h2→h5 skip, ×4 section headings). Both fixed.
3. `auth/reset-password.test.jsx` — **zero violations on first run**,
   no fix needed.

Post-fix: all 3 suites pass, including `booking/index.test.jsx`'s
narrowly-scoped `knownGapRuleIds: ['heading-order']` exclusion for the
one remaining, deliberately-not-fixed gap (see `REQ146`).

## Full suite regression

`CI=true npx jest --maxWorkers=2`: **30 suites, 205/208 tests green.**
3 suites failed on the full-parallel run:

| Suite | Cause | Confirmed |
|---|---|---|
| `EncounterWorkspace.test.jsx` | Contention timeout | Pre-existing, documented in `CLAUDE.md` before this slice |
| `manager/claims/index.test.jsx` | Fails identically even alone | Pre-existing, unrelated (own commit history predates this session, imports neither `AuthContext` nor `apollo/client`) |
| `booking/index.test.jsx` | Contention timeout | **Re-ran alone: 8/8 green**, including the new a11y test |

No suite failed for a reason connected to this slice's own changes.

## What was not verified

- **`gitleaks` itself was not run locally** — Homebrew's `gitleaks`
  formula requires newer Xcode Command Line Tools than are installed on
  this machine, unrelated to the slice. The step will get its first
  real execution on the first real GitHub Actions run, same as every
  other job in this workflow file.
- **Lighthouse CI (CI-6), visual regression (CI-8), i18n coverage
  (CI-10)** — not attempted; no prerequisite existed to make any of the
  three cheap to add in this slice, and none is named in P1-03's own
  scope.
