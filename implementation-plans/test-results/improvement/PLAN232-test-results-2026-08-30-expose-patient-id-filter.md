---
id: PLAN232
type: improvement
feature: test-results
created: 2026-08-30
updated: 2026-08-30
status: done
parent: REQ169
related: [TP252, TR252]
---

# PLAN232 — Expose `patient_id` on `TestResultType` + a `patient_id` filter argument

Closes `context/open-questions.md #20`. Confirmed before touching anything
that `TestResults.patient_id` already exists on the model (`BUG027` fixed
`orderTest()` to write it, 2026-08-26) — the open question's own premise
of needing a schema change was stale. The real, narrower gap: the column
was never exposed to GraphQL and never filterable.

## Changes

- `entities/test-result.entity.ts` — `patient_id: string` (nullable
  `ID`) added to `TestResultType`.
- `test-results.service.ts` — `findAll()` gains an optional `patientId`
  parameter; `toGraphQL()` now maps `row.patient_id`. The new filter
  (`...(patientId ? {patient_id: patientId} : {})`) sits alongside, never
  in place of, the existing org-scope (`orgScopeVia(user, 'ordered_by')`)
  and patient self-scope — a caller can never widen access by passing
  `patientId`, only narrow an already-scoped result set.
- `test-results.resolver.ts` — `testResults` query gains an optional
  `patient_id: ID` argument.
- `patients/detail.jsx` — Test Results tab rewritten off a new local
  `GET_PATIENT_TEST_RESULTS` query (matching this file's own
  local-override convention, since the canonical `TEST_RESULTS_QUERY` has
  no `patient_id` argument), with real loading/empty states. `MOCK_TESTS`
  deleted entirely. The View Result dialog now renders the real completed
  `values` array as a table (name/value/ref, flagged-abnormal values
  highlighted) instead of a static "not yet available" placeholder — the
  field was already being fetched, just never rendered.

## Verification

Backend: `test-results.service.spec.ts` — 4 new cases (patientId filter
applied/omitted, patient_id exposed/left undefined for a free-text row).
Full backend suite 134/134 suites, 2128/2128 tests. `tsc --noEmit` +
`eslint` clean. Frontend: `patients/detail.test.jsx` — 3 new cases (empty
state, a real result rendered under its real field names — never the old
fabricated Dr. Jane Smith/Dr. Carlos Vega names — and the real values
table in the View Result dialog); `test-results/index.test.jsx`'s own 5
tests unaffected (confirms the canonical query/page were untouched).
`eslint` clean; production build clean.

Live: ordered a real Blood Test for a real patient ("Priya Patient")
through the standalone Test Results page, confirmed the row's
`patient_id` was written correctly via a direct DB check, then confirmed
it rendered on that same patient's own detail page's Test Results tab
end-to-end. The live-verification row was deleted afterward (not a shared
fixture, no lasting value once verified).
