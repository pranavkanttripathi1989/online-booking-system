---
id: TR096
type: requirement
feature: insurance-claims
created: 2026-08-24
updated: 2026-08-24
status: pass
parent: TP097
related: [REQ031, PLAN070]
---

# TR096 — Results: payer/TPA master + empanelment + patient policy capture

Executed 2026-08-24, consolidated verification pass (all 8 slices).

| Case | Result | Evidence |
|---|---|---|
| TC-01 | pass | `findPayers applies no org filter at all — a global directory`. **A trivial test-authoring bug caught before merging**: the first draft asserted `findMany` was called with `{ where: {} }` only, but the service also always passes a deterministic `orderBy: { name: 'asc' }` — fixed to assert the full call shape rather than a partial one, per the same "don't write an assertion that would pass against slightly-wrong code" discipline this session applied elsewhere. |
| TC-02 | pass | `rejects an unknown payer_id` |
| TC-03 | pass | `rejects a clinic_id belonging to a different org` |
| TC-04 | pass | `stamps client_org_id from the validated clinic` |
| TC-05 | pass | `rejects updating the status of a cross-org empanelment` |
| TC-06 | pass | `rejects a patient caller reading an arbitrary patient_id policy list` |
| TC-07 | pass | `rejects an unknown payer_id on policy creation` |
| TC-08 | pass | New `insurance`/`payerEmpanelments` domain-case — matrix + tenancy suites both green |
| TC-09 | pass | `npx tsc --noEmit` — clean |
| TC-10 | pass | `npx eslint` — 0 errors |
| TC-11 | pass | `npm test` — 73/73 suites, 1053/1053 tests |
| TC-12 | pass | `npm run test:int` — 4/4 suites, 315/315 tests |

## Live verification (2026-08-24, follow-up)

The backend container recovered after a full Docker Desktop restart (see
`TR092`'s environment note). `payers` query confirmed reachable and
returns cleanly (`manager@medibook.dev`). `createPayer` is `super_admin`
-only and, like `plans`' own mutations (see `TR092`), no seed account
with that role exists in this dev environment to exercise the write path
live — not independently confirmed beyond the unit-test coverage in
`TP097`.
