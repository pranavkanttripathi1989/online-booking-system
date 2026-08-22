---
id: TP060
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: BUG012
related: [BUG007, PLAN033, TR059]
---

# TP060 — Verification for closing the tenancy matrix's KNOWN_GAPS domains

## Suggestion stage

Skipped per the `CLAUDE.md` conditional rule — extending an already-proven
harness pattern (`BUG007`'s matrix) to more domains, plus small `@Auth()`
fixes matching an established sibling-mutation convention, not exploratory.

## The trap this plan has to avoid

`BUG007` itself documents the strongest argument for this exact harness:
"the unit suite had begun asserting the defect... a suite that cannot
detect a defect eventually gets edited to agree with it." Extending the
matrix without also checking whether any of the 10 gap domains' EXISTING
unit tests already pinned their ungated/unscoped state as correct would
repeat that mistake at the moment of fixing it.

## Per-case contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | `npm run test:int` full run | All suites pass, including `matrix-coverage.int-spec.ts` |
| TC-02 | `matrix-coverage.int-spec.ts`'s "known-gap list has not grown" assertion | `actualGaps` equals `KNOWN_GAPS` (now `[]`) — proves no domain is unclassified and no stale gap entry remains |
| TC-03 | `matrix-coverage.int-spec.ts`'s "no domain both covered and exempt" assertion | Passes — `organizations`/`org-settings`/`notifications` are in `EXEMPT` only, not `COVERED_DOMAINS` |
| TC-04 | Each of the 7 new `tenancy matrix` case blocks, across all 9 `READERS` | Same-org caller sees own row and not the foreign org's; platform operator sees both; wrong-role caller gets `FORBIDDEN`; anonymous gets `UNAUTHENTICATED`; org-less patient sees neither |
| TC-05 | Existing `availability.resolver.spec.ts` test that previously asserted `availabilities` was ungated | Corrected to assert the real gated role list, not left describing the old (bug) state |
| TC-06 | Live, real-JWT check (not jest mock) — `patient` token against `availabilities`, `spacerBlocks`, `getSpacerBlocks` | All three return `FORBIDDEN` |
| TC-07 | Live, real-JWT check — `staff` against `availabilities`, `manager` against `spacerBlocks` | Both succeed with real data |
| TC-08 | Live, real-JWT check — unlinked demo `clinician` account (`clinician_id: null`) against `getSpacerBlocks` for a real, different clinician's id | Rejected with `NotFoundException`, proving the self-scope check fails closed on a null link, not open |
| TC-09 | Regression: `npx jest --maxWorkers=2` (backend unit suite), `npx eslint`, `npx tsc --noEmit` | All green, no new warnings/errors |

## How TC-01–05 were checked

`docker compose --profile test up -d postgres_test` then
`cd backend && npm run test:int` — real `AppModule`, real PostgreSQL, real
JWTs through the real guard chain, per the harness `BUG007` already
established. Not a mock at any layer.

## How TC-06–08 were checked

Direct `curl` POST to `http://localhost:4000/graphql` against the running
dev stack, using real `login` mutations for the `patient@medibook.dev`,
`receptionist@medibook.dev` (`staff` role), `manager@medibook.dev`, and
`clinician@medibook.dev` (unlinked demo account) seeded accounts — chosen
specifically because "the mock proved it" was rejected as sufficient
evidence earlier in this same session's `BUG011` investigation, and the
same discipline applies here: a live check is not optional when the claim
is "this is no longer exploitable."
