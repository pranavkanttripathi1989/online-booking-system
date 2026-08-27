---
id: CTX-frontend-platform-2026-08-27-p1-07-i18n-framework
type: improvement
feature: frontend-platform
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ150
related: [PLAN190, TP210, TR210]
---

# frontend-platform — i18n framework + English/Hindi (2026-08-27)

Phase 1 slice **P1-07**, the 7th of a 15-slice batch. Closes
`FRONTEND_RULES.md`'s own "no i18n layer exists today" gap — the
document's own §20.1 named this the single most expensive rule to
retrofit; this slice is that retrofit, started before the cost grows
further.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ150 | [i18n framework + English/Hindi extraction](../../requirements/frontend-platform/improvement/REQ150-frontend-platform-2026-08-27-i18n-framework-and-english-hindi.md) |
| implementation-plans | PLAN190 | [implementation plan](../../implementation-plans/frontend-platform/improvement/PLAN190-frontend-platform-2026-08-27-i18n-framework-and-english-hindi.md) |
| test-plans | TP210 | [test plan](../../test-plans/frontend-platform/improvement/TP210-frontend-platform-2026-08-27-i18n-framework-and-english-hindi.md) |
| test-results | TR210 | [results](../../test-results/frontend-platform/improvement/TR210-frontend-platform-2026-08-27-i18n-framework-and-english-hindi.md) |

## What shipped

- **The framework, complete**: `react-i18next`+`i18next`, a custom lazy
  per-language backend (real Vite code-splitting via dynamic `import()`,
  confirmed in the build output), English bundled synchronously via
  `partialBundledLanguages` so the common case never suspends,
  `localStorage` persistence, a language switcher reachable before login
  on every public route.
- **The gate**: a new `I18N-1` ESLint rule (`no-restricted-syntax`,
  matching `no-hardcoded-colors`' own established pattern), ratcheted to
  its real measured baseline (4,779 warnings, up from 1,906 — the honest
  size of ~90 unextracted pages' worth of debt, surfaced not hidden).
- **The pseudo-locale** (`I18N-4`): generated, not hand-written, from
  the real English source — +40% length, non-ASCII. A real Playwright
  overflow-probe spec written against it, not executed live (no
  browser-automation tool this session).
- **The CI coverage gate** (`I18N-10`): missing/dead-key detection plus
  pseudo-locale staleness checking, wired into `ci.yml`.
- **Two fully-extracted, fully-tested surfaces**: `PublicLayout.jsx`
  (every public route's shell) and the booking wizard's "Select Time"
  step — verified with a real, live Hindi switch, not just that
  translation keys resolve in isolation.

## The scope decision, stated plainly

The tracker's own instruction — "extract incrementally, gate
immediately" — was followed literally: the framework is complete, two
real surfaces are fully done, and the other ~90 pages are honestly
left as measured, visible debt (the new 4,779-warning ratchet), not
silently ignored and not attempted all at once.

## A real bug found and fixed before this shipped

The pseudo-locale generator's first draft accentified the *inside* of
`{{interpolation}}` placeholders too, silently breaking i18next's own
placeholder matching. Caught by inspecting the generated output before
writing any test against it, fixed by protecting placeholder segments
from the transform, and pinned with a regression test.

## Verification

Frontend: 34 unit suites total (2 new — `PublicLayout.test.jsx`,
`pseudo-locale.test.js`), 32/34 passing (the 2 failures both confirmed
pre-existing/unrelated by isolation re-runs); lint at the new
4,779-warning ratchet, zero errors; `i18n:coverage` passing including
its failure-path verified directly; build succeeds with confirmed real
per-language code-splitting; `size-limit` green at a newly-measured 350
KB initial-bundle budget (up from 335 KB, the real cost of the new
dependency, `BASE-5`). See TR210 for the full account.
