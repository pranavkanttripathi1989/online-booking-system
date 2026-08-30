---
id: REQ169
type: improvement
feature: test-results
created: 2026-08-30
updated: 2026-08-30
status: done
parent: BUG027
related: [PLAN232, TP252, TR252]
---

# REQ169 — Expose `patient_id` on `TestResultType` + a `patient_id` filter argument

## Why this slice

`context/open-questions.md #20`, raised while fixing `BUG055`: `patients
/detail.jsx`'s Test Results tab stayed mock (a "Showing sample data"
disclosure) because there was no way to ask the real backend for one
specific patient's test results. The open question's own framing assumed
this needed a schema change (a `patient_id` FK on `TestResults`,
backfilled). **Re-verified before starting, not assumed**: the column
already exists — `BUG027` (2026-08-26) already fixed `orderTest()` to
write it. The real gap was narrower: `TestResultType` never exposed
`patient_id` to GraphQL, and `testResults`'s resolver had no filter
argument to query by it at all. User chose to prioritize closing this now.

## What shipped

- `TestResultType.patient_id` (nullable `ID`) — the column already
  existed, this is the first time it's exposed.
- `testResults(patient_id: ID)` — a new optional filter argument.
  Combines with the existing org-scope (`orgScopeVia(user, 'ordered_by')`)
  and the existing patient self-scope; never a substitute for either — a
  `patient_id` belonging to a patient outside the caller's own org simply
  matches nothing, since no result ordered within that org could ever
  belong to it.
- `patients/detail.jsx`'s Test Results tab now queries
  `testResults(patient_id: $id)` for real, with real loading/empty states,
  replacing the local `MOCK_TESTS` array entirely. The View Result dialog
  now also shows the real completed values table (name/value/ref, with a
  flagged-abnormal value highlighted) instead of a placeholder "not yet
  available" message — the `values` field was already fetched but never
  rendered.

## Deliberately out of scope

- No backfill of `patient_id` on pre-`BUG027` rows — those remain
  free-text walk-in results with no patient link, exactly as before.
- No change to the standalone `test-results/index.jsx` page or the
  canonical `TEST_RESULTS_QUERY` in `graphql/queries.js` — this page uses
  its own local query (matching this file's own established
  local-override convention for Insurance/Packages/Membership/
  Immunizations), since the canonical query has no `patient_id` argument
  and changing it isn't needed for this fix.
