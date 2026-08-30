---
id: CTX-test-results-2026-08-30-req169
type: improvement
feature: test-results
created: 2026-08-30
updated: 2026-08-30
status: done
parent: BUG027
related: [REQ169, PLAN232, TP252, TR252]
---

# Expose `patient_id` on `TestResultType` + a filter argument (2026-08-30)

Closes `context/open-questions.md #20`, raised while building `REQ167`
(immunisation schedule tracker) and flagged to the user directly, who
chose to prioritize a real fix now via `AskUserQuestion`.

The open question's own framing assumed a schema change was needed. Not
so — re-verified first: `TestResults.patient_id` already existed (`BUG027`,
2026-08-26, fixed `orderTest()` to write it). The real gap was that
`TestResultType` never exposed the column to GraphQL and `testResults`
had no filter argument to query by it. Fixed: entity field, an optional
`patient_id` resolver argument (additive to, never a substitute for, the
existing org-scope/self-scope), and `patients/detail.jsx`'s Test Results
tab wired to the real query — `MOCK_TESTS` deleted. The View Result
dialog also now shows the real completed values table instead of a
placeholder message, since the data was already being fetched.

Verification: backend 134/134 suites (4 new tests), frontend
`patients/detail.test.jsx` 27/27 (3 new), `test-results/index.test.jsx`
5/5 unaffected, `eslint`/build clean. Live: a real ordered test for a
real patient wrote a real `patient_id` (confirmed via direct DB check)
and appeared correctly on that patient's own detail page.

See `REQ169`/`PLAN232`/`TP252`/`TR252` for full detail.
