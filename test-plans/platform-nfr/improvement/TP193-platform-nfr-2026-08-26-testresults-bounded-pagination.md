---
id: TP193
type: improvement
feature: platform-nfr
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN173
related: []
---

# TP193 — Test plan: testResults bounded pagination

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | skip/take derived correctly | `findAll(..., 20, 3, user)` | `findMany` called with `skip: 40, take: 20` |
| 2 | paginatorInfo computed correctly | populated page | `count`/`currentPage`/`firstItem`/`hasMorePages`/`lastItem`/`lastPage`/`perPage`/`total` all correct |
| 3 | hasMorePages false on last page | `total: 5, first: 20` | `hasMorePages: false`, `lastPage: 1` |
| 4 | Empty result, no negative firstItem | `total: 0` | `firstItem: 0` |
| 5 | Existing scoping/filters unchanged | Every pre-existing `findAll` test | All 13 still pass unmodified in behavior, only call signature changed |
| 6 | Frontend renders real paginated data | `test-results/index.jsx` | Real rows from `data.testResults.data` shown |
| 7 | No mock fallback on genuine empty result (the bug fixed) | Empty `data` array, no error | Real empty state shown, `MOCK_RESULTS`' own fixture patient never appears |
| 8 | Mock fallback still works on a real error | GraphQL error | `MOCK_RESULTS` shown |
| 9 | Honest truncation note | `hasMorePages: true` | "showing the N most recent of Total" shown |
| 10 | No truncation note when unnecessary | `hasMorePages: false` | No such note |
| 11 | Tenancy matrix fixture matches new shape | `test:int` | `test-results` domain case passes; no `GRAPHQL_VALIDATION_FAILED` |
| 12 | Full suite regression | Backend unit + integration; frontend `test-results` suite | 92/92 / 1525/1525; integration 4/4 / 387/387; frontend 5/5 |
| 13 | Lint clean, ratchet unchanged | `npm run lint` | 0 errors; 1909 warnings (unchanged from `REQ132`'s lowered ceiling) |
