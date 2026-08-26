---
id: TR197
type: improvement
feature: insurance-claims
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP197
related: []
---

# TR197 — Test results: auto-attach a claim's issued prescriptions as evidence

All 7 `TP197` cases pass.

`npx jest src/insurance/insurance.service.spec.ts
src/prescriptions/prescriptions.service.spec.ts --maxWorkers=2`: 89/89
tests pass (5 new: 3 in `insurance.service.spec.ts`, 2 in
`prescriptions.service.spec.ts`).

Full backend unit suite: 92/92 suites, 1544/1544 tests. Integration
suite: 4/4 suites, 387/387 tests, unchanged — no schema change, and
`matrix-coverage.int-spec.ts` did not flag a new-domain gap (`insurance`
already classified). `tsc --noEmit` clean. `npx eslint
"src/insurance/**/*.ts" "src/prescriptions/**/*.ts"`: 0 errors.

`backend/src/schema.gql` regenerated with the new
`claimEvidencePrescriptions(claim_id: ID!): [Prescription!]!` field
confirmed present after a full `npm run test:int` run (which boots the
real `AppModule`) — the file itself was left uncommitted, since it also
picked up unrelated pre-existing schema drift from other in-progress
work in this repo, not something this slice owns.

## Live verification

Not performed against the real dev stack — no browser/CLI GraphQL
client available this session. The mocked-Prisma coverage above
exercises the real join path (claim → encounter → prescriptions), the
cross-org rejection, and the no-encounter-yet empty state.
