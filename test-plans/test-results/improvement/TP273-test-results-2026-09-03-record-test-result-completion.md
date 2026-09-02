---
id: TP273
type: improvement
feature: test-results
created: 2026-09-03
updated: 2026-09-03
status: approved
parent: PLAN253
related: [REQ184]
---

# TP273 — Test plan: `recordTestResult` completion path (P2-13)

Suggestion stage skipped, same grounds as every prior slice this session: the
full technical design (transition map, tenant-scope reuse, the
extend-vs-new-page decision) was reviewed and approved via `ExitPlanMode`
before any code was written.

## `TestResultsService#recordResult`

| # | Case | Expected |
|---|---|---|
| 1 | Missing test result | Rejected (`NotFoundException`) |
| 2 | Cross-org test result | Rejected (`NotFoundException`), no existence confirmation |
| 3 | `completed → *` (any further transition) | Rejected — completed is terminal |
| 4 | `processing → pending` | Rejected — no legal backward transition |
| 5 | `completed` with zero values | Rejected |
| 6 | `pending → processing` with zero values | Allowed |
| 7 | `pending → completed` directly (skipping processing) | Allowed |
| 8 | `date_completed` on a `processing` transition | Left unset |
| 9 | `date_completed` on a `→ completed` transition | Set to the current time |
| 10 | `toGraphQL()`'s withholding logic against a genuinely completed row | Returns the real `values` array — the first test in this domain's history that can assert this end-to-end |

## Live-only checks (not unit-testable against a mocked Prisma client)

- Container boot after schema/resolver changes — confirms no `@Args`
  reflection failure (this session's own repeatedly-proven-in lesson,
  applied proactively again).
- Live introspection of `Mutation` confirming `recordTestResult` is
  genuinely served.
- Full integration suite, including the pre-existing `test-results`
  tenancy-matrix row in `matrix-coverage.int-spec.ts` — confirms this
  same-domain addition didn't regress the domain's already-proven
  cross-tenant guarantee.

## Frontend

| # | Case | Expected |
|---|---|---|
| 11 | A pending result | Shows a "Record Result" action |
| 12 | A completed result | Does NOT show a "Record Result" action |
| 13 | Completing a result via the dialog | Calls `recordTestResult` with the typed values, shows a success toast, refetches the list |
| 14 | Clicking a status KPI card | Filters the list to that status |

## Live-only frontend checks

- A real browser pass driving the full order → record → complete flow
  against the live backend, logging in as a real seeded account.
