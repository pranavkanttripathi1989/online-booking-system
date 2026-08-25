---
id: TR160
type: improvement
feature: repo-hygiene
created: 2026-08-26
updated: 2026-08-26
status: done
parent: TP160
related: [PLAN143]
---

# TR160 — Test results: backend unit test suite speed

## TP160 case outcomes

| # | Case | Result |
|---|---|---|
| 1 | Baseline (before `isolatedModules`) | 189.211s, 84 suites / 1324 tests (measured earlier this session, before the other slices in this batch added their own suites) |
| 2 | After `isolatedModules: true` | **83.179s**, 86 suites / 1347 tests (86/86 passing — the +2 suites/+23 tests are the other session's concurrently-landed `tasks` module, unrelated to this change) — a real ~56% reduction |
| 3 | `npx tsc --noEmit` | Clean |
| 4 | `npx eslint "{src,apps,libs,test}/**/*.ts"` | Clean |
| 5 | In-container timing | Not re-measured separately this run (host timing alone already demonstrates the fix; the residual container-vs-host gap from I/O/contention is explicitly out of scope per `REQ103`'s own doc) |

## Conclusion

Real, measured improvement with zero test-count regression and zero lost
type coverage (both `tsc --noEmit` and `eslint` remain the enforcement
layer, unchanged). `REQ103` acceptance criteria met.
