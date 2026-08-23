---
id: TR064
type: improvement
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP065
related: [REQ036, PLAN038]
---

# TR064 — Results for the `getClinicians` N+1 fix

Executed 2026-08-23 against the real running dev backend, on `master`.

| Case | Result | Evidence |
|---|---|---|
| TC-01 one `groupBy` call regardless of N | **pass** | Unit test: `expect(prisma.reviews.groupBy).toHaveBeenCalledTimes(1)` with 2 clinicians |
| TC-02 present-in-result mapping | **pass** | `cln-1` (mocked `_avg.stars: 4.5, _count.stars: 10`) resolved to `{rating: 4.5, reviews: 10}` |
| TC-03 absent-from-result mapping | **pass** | `cln-2` (not in the mocked `groupBy` array) resolved to `{rating: undefined, reviews: 0}` |
| TC-04 zero clinicians | **pass** | `groupBy` confirmed not called when `findMany` returns `[]` |
| TC-05 live query | **pass** | `curl` against `http://localhost:4000/graphql`: all 10 real seeded clinicians returned with `"reviews":0` (no real review rows exist in this dev DB) |
| TC-06 typecheck/lint | **pass** | `npx tsc --noEmit` and `npx eslint "src/public/**/*.ts"`: clean |

## Commit

Pending — see the commit immediately following this doc.
