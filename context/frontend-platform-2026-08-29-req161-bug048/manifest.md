---
id: CTX-frontend-platform-2026-08-29-req161-bug048
type: improvement
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: done
parent: REQ161
related: [BUG048, PLAN214, PLAN215, TP234, TP235, TR234, TR235]
---

# frontend-platform — six regional languages (P2-09) + clinician route-guard gap (2026-08-29)

Two pieces of work landed together in one continuous pass, both picked
up in the same `continue` turn: `P2-09` (the next unstarted phase-plan
slice) and a live-QA finding surfaced while the user asked a direct
question about the clinician consultation → prescription flow.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ161 | [Six more regional languages](../../requirements/frontend-platform/improvement/REQ161-frontend-platform-2026-08-29-six-regional-languages.md) |
| requirements | BUG048 | [Clinician route-guard gap](../../requirements/frontend-platform/bug/BUG048-frontend-platform-2026-08-29-clinician-route-guard-gap.md) |
| implementation-plans | PLAN214 | [implementation plan — languages](../../implementation-plans/frontend-platform/improvement/PLAN214-frontend-platform-2026-08-29-six-regional-languages.md) |
| implementation-plans | PLAN215 | [implementation plan — route guard](../../implementation-plans/frontend-platform/bug/PLAN215-frontend-platform-2026-08-29-clinician-route-guard-gap.md) |
| test-plans | TP234 | [test plan — languages](../../test-plans/frontend-platform/improvement/TP234-frontend-platform-2026-08-29-six-regional-languages.md) |
| test-plans | TP235 | [test plan — route guard](../../test-plans/frontend-platform/bug/TP235-frontend-platform-2026-08-29-clinician-route-guard-gap.md) |
| test-results | TR234 | [results — languages](../../test-results/frontend-platform/improvement/TR234-frontend-platform-2026-08-29-six-regional-languages.md) |
| test-results | TR235 | [results — route guard](../../test-results/frontend-platform/bug/TR235-frontend-platform-2026-08-29-clinician-route-guard-gap.md) |

## What shipped

**`REQ161` (P2-09)**: six new locale bundles (`ta`, `bn`, `mr`, `te`,
`kn`, `gu`) wired into the existing `P1-07` i18n framework —
`SUPPORTED_LANGUAGES`/`localeLoaders` extended, no new mechanism. A
real pre-existing gap was fixed alongside: `check-i18n-coverage.mjs`'s
`TARGET_LANGUAGES` was hardcoded to `['hi']` only, so CI never actually
checked coverage for any future language until this pass added the
6 new codes to it. Scope: the phase-plan named "3 more"; the user
selected both offered option sets (Tamil/Bengali/Marathi AND Telugu/
Kannada/Gujarati) via `AskUserQuestion`, expanding this to all 6.

**`BUG048`**: found while directly answering the user's question ("have
you checked all frontend if clinician start consultation how he can
start or write prescription") — a full trace confirmed the real
click-path (appointment detail → Start Consultation →
`EncounterWorkspace` → New Prescription → `PrescriptionBuilder`) is
correctly wired end-to-end, but neither route had a `RoleGuard`.
`EncounterWorkspace` degraded safely (its own internal `hasRole`
check); `PrescriptionBuilder` had no internal check at all. Backend
`@Auth('clinician')` on `createPrescription` meant this was never a
real data leak, but it's the same "frontend gate doesn't match backend
`@Auth`" class this codebase has hit before — fixed by wrapping both
routes in `<RoleGuard roles={['clinician']} />>`.

## Honest limitations, stated not hidden

- The 6 new translations are a good-faith machine/LLM-assisted first
  pass with no native-speaker review — flagged explicitly in `REQ161`.
- Live e2e re-verification of the route-guard fix and the language
  switcher was not performed this pass (no browser-automation tool
  invoked) — logged as the next step in both `TR234`/`TR235`, not
  silently skipped.
- `PrescriptionBuilder.jsx`'s own print-language picker deliberately
  stays English/Hindi-only — widening it needs new backend font work
  per script, out of scope here.

## Verification

Frontend: `npm run i18n:coverage` — 7/7 real target languages fully
covered (64/64 keys each); `npx eslint` on every touched file — 0
errors; `npm run build` + `npm run size` — all three budgets green;
full `npx jest` — see `TR234`/`TR235` for the exact pass/fail account,
including isolation re-runs of any suite that failed under
full-parallel contention before being treated as a real regression.
