---
id: TR117
type: improvement
feature: platform-integrations
created: 2026-08-25
updated: 2026-08-25
status: pass
parent: TP118
related: [REQ064, PLAN091]
---

# TR117 — Results for the booking widget edit UI (REQ064)

Executed 2026-08-25 against `medibook_backend`/`medibook_postgres` (the
shared dev stack) on `master`. No backend change in this slice.

## Frontend unit — `settings/index.test.jsx` (extended)

| Case | Result |
|---|---|
| Editing a widget's origins calls the real mutation with the correct variables and preserves the slug | **pass** |

1/1. Full frontend unit suite re-run at the end (this being the final
slice in the whole A-4–A-9 batch): 18 suites / 117 tests, all passing
(`--runInBand`). `eslint`: 0 errors, 162 warnings (ratchet held — no new
warnings from this slice's own edit). `npm run build`: clean.
`scripts/check-page-data-wiring.mjs`: 0 new fabricated pages.

## e2e — `gap-analysis-a4-a9.spec.js` (renamed from
`gap-analysis-a4-a8.spec.js`, extended with a 5th test)

| Case | Result |
|---|---|
| Manager edits a real widget config's origins; new origin and original slug both confirmed | **pass** |

1/1. Full file re-run end to end: 5/5 passing. Confirmed via a direct DB
check after the run that the fixture `BookingWidgetConfig` row (and
every other fixture row created across all five tests in this file) was
fully cleaned up.

## Commits

See the commits immediately following this test-results doc in `git log`.
