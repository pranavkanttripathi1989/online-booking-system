---
id: TR059
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP060
related: [BUG007, BUG012, PLAN033]
---

# TR059 — Results for closing the tenancy matrix's KNOWN_GAPS domains

Executed 2026-08-23 against `medibook_test` (port 5433, tmpfs, real
`AppModule`) and the running dev stack (`medibook_backend`, restarted to
compile the resolver/service changes), on `master`.

## Per-case contract

| Case | Result | Evidence |
|---|---|---|
| TC-01 full `npm run test:int` | **pass** | 3 suites, 183/183 tests (up from 120) |
| TC-02 `actualGaps` equals `KNOWN_GAPS` | **pass** | `matrix-coverage.int-spec.ts` green; `KNOWN_GAPS` is `[]` |
| TC-03 no domain both covered and exempt | **pass** | same suite, same run |
| TC-04 all 7 new domain cases × 9 readers | **pass** | included in the 183 — `tenancy.int-spec.ts`'s `describe.each` picks up the new `CASES` entries automatically, no runner change needed |
| TC-05 `availability.resolver.spec.ts` correction | **pass** | test now asserts `toEqual(['manager','admin','super_admin','staff'])` instead of `toBeUndefined()` |
| TC-06 live `patient` token vs. the 3 previously-ungated queries | **pass** | all three returned `{"errors":[{"...FORBIDDEN...","path":["availabilities"/"spacerBlocks"/"getSpacerBlocks"]}]}` |
| TC-07 live `staff`/`manager` tokens vs. their legitimate queries | **pass** | `availabilities` returned 7 real rows for `staff`; `spacerBlocks` returned 1 real row for `manager` |
| TC-08 live unlinked `clinician` demo account vs. `getSpacerBlocks` for a real different clinician | **pass** | `{"errors":[{"message":"Clinician not found",...,"statusCode":404}]}` — self-scope check fails closed on `clinician_id: null`, not open |
| TC-09 regression (unit/lint/typecheck) | **pass** | `npx jest --maxWorkers=2`: 660/660, 52 suites; `npx eslint`: clean; `npx tsc --noEmit`: clean |

## What TC-06–08 actually proved, precisely

These three live checks are the ones that matter most: a mocked-Prisma unit
test can prove a service *built* the right `where` clause without proving
the resolver ever enforces it, exactly the gap `BUG007` already identified
("a `where` clause can look correct and still leak"). Running real
`login` mutations for `patient@medibook.dev`, `receptionist@medibook.dev`,
`manager@medibook.dev`, and the unlinked `clinician@medibook.dev` demo
account, then hitting the real GraphQL endpoint with each real token,
confirms the fix holds through the actual guard chain
(`GqlThrottlerGuard` → `GqlAuthGuard` → `RolesGuard`), not just in a test
double.

## Static checks

`npx eslint "{src,apps,libs,test}/**/*.ts"`: 0 errors, 0 warnings. `npx tsc
--noEmit`: clean. Both cover the new `blocks.resolver.spec.ts` and the
extended `blocks.service.spec.ts`/`availability.resolver.spec.ts`.

## Commits

`d818e1e` (the three `@Auth()`/scoping fixes), `af9c2dc` (the tenancy-matrix
extension itself — 7 new cases, 3 new exemptions, fixture rows).
