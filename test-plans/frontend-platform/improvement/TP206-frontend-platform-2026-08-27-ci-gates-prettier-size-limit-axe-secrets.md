---
id: TP206
type: improvement
feature: frontend-platform
created: 2026-08-27
updated: 2026-08-27
status: approved
parent: REQ146
related: [PLAN186, TR206]
---

# TP206 — Test plan: frontend CI gates

Tooling-wiring slice against an already-proven pattern (the lint-ratchet
gate this codebase already runs successfully) — drafted directly, no
`test-suggestions/` entry.

## Static/tooling checks (the gates themselves)

- `npx prettier --check .` passes clean.
- `npm run size` — all three `.size-limit.json` budgets pass.
- `npm run lint` — 0 errors, warning count unchanged from the pre-slice
  baseline (no ratchet increase from the mass reformat).
- `npm run build` — succeeds, bundle byte sizes unchanged (modulo
  comment-only diffs from reformatting).
- `.github/workflows/ci.yml` — YAML syntax valid; `secrets`/frontend job
  steps present and correctly ordered.

## Real test-suite verification (a11y)

- `booking/index.test.jsx`, `admin/Communications.test.jsx`,
  `auth/reset-password.test.jsx` — each new "accessibility" describe
  block passes with a real `axe()` scan against a real rendered
  container, not a mock.
- Confirm the fix, not just the gate: re-run each suite **before** the
  corresponding source fix landed to see the real violation message
  (done manually during this slice — see `TR206`), then again after, to
  prove the fix (not the exclusion list) closed it.
- `booking/index.test.jsx`'s own `knownGapRuleIds: ['heading-order']`
  exclusion must be the *only* rule excluded — any other rule failing
  here must still fail the test.

## Regression

- Full frontend suite (`CI=true npx jest --maxWorkers=2`) — no suite
  should newly fail that wasn't already a documented, contention-only
  flake before this slice (`EncounterWorkspace.test.jsx`,
  `manager/claims/index.test.jsx`). Any other suite failing here needs
  investigation, not a shrug.
- Any suite that fails in the full-parallel run must be re-run alone
  (`--maxWorkers=1`) before being written off as contention.
