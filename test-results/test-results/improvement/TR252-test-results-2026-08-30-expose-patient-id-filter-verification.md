---
id: TR252
type: improvement
feature: test-results
created: 2026-08-30
updated: 2026-08-30
status: pass
parent: TP252
related: [REQ169, PLAN232]
---

# TR252 — Results for exposing `patient_id` on `TestResultType` + filter argument

Executed 2026-08-30 against the running dev stack (`medibook_backend`,
`medibook_frontend`, real `medibook_db`), on `master`.

## Per-defect/feature contract

| Case | Result | Evidence |
|---|---|---|
| TC-01 patientId filter applied | **pass** | `test-results.service.spec.ts` |
| TC-02 patientId filter omitted | **pass** | |
| TC-03 patient_id exposed | **pass** | |
| TC-04 patient_id undefined for free-text row | **pass** | |
| TC-05 tab empty state | **pass** | `patients/detail.test.jsx` |
| TC-06 real result rendered | **pass** | |
| TC-07 View Result dialog shows real values | **pass** | |
| TC-08 standalone page unaffected | **pass** | `test-results/index.test.jsx`, all 5 pre-existing tests green |
| TC-09 live round trip | **pass** | see narrative |

## Narrative

**TC-09** — ordered a real "Blood Test" for the real seeded patient "Priya
Patient" (`7ea9442e-e2c6-42a4-85b0-268e59fcb51d`) via the standalone Test
Results page's own Order Test dialog. A direct `psql` check against
`medibook_db` confirmed the created row's `patient_id` column was set to
Priya Patient's real id (not null, not a name-matched guess). Navigating
to that same patient's own detail page and opening the Test Results tab
showed the real row — test name, ordering staff name, and date — with no
mock fallback anywhere in the path. The verification row was deleted
afterward via `psql` (a one-off row created for this check, not a shared
fixture — no lasting value once confirmed).

## Full suite verification

Backend: 134 suites / 2128 tests (4 new), `tsc --noEmit` + `eslint`
clean. Frontend: `patients/detail.test.jsx` 27/27 (3 new for Test
Results); `test-results/index.test.jsx` 5/5 unaffected; `eslint` clean;
production build clean.
