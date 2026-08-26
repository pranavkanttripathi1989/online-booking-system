---
id: CTX-insurance-claims-2026-08-26-req131
type: improvement
feature: insurance-claims
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ131
related: [PLAN171, TP191, TR191]
---

# insurance-claims — REQ131: OPD cashless claim submission and tracking (2026-08-26)

Eighth slice of the next 10-slice batch (`project-plans/12-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ131 | [OPD cashless claim submission](../../requirements/insurance-claims/improvement/REQ131-insurance-claims-2026-08-26-opd-cashless-claim-submission.md) |
| implementation-plans | PLAN171 | [implementation plan](../../implementation-plans/insurance-claims/improvement/PLAN171-insurance-claims-2026-08-26-opd-cashless-claim-submission.md) |
| test-plans | TP191 | [verification plan](../../test-plans/insurance-claims/improvement/TP191-insurance-claims-2026-08-26-opd-cashless-claim-submission.md) |
| test-results | TR191 | [verification results — pass](../../test-results/insurance-claims/improvement/TR191-insurance-claims-2026-08-26-opd-cashless-claim-submission.md) |

## What shipped

`REQ031`'s own doc explicitly reserved a claim state machine as its own
P2 follow-on requirement — this is that follow-on. A new `Claims` table
and a basic tracking state machine (submitted → under_review →
approved/rejected → settled), manual/portal-assist throughout per the
PRD's own R11 risk mitigation (no real payer API — most insurers/TPAs
work through bespoke portals and email). New `manager/claims/index.jsx`
claims desk page.

## A real bug, caught only by the integration suite

The `claims` query's `status` argument omitted an explicit GraphQL type
function on a `string | undefined` parameter — NestJS/GraphQL's schema
factory can't infer a type from a TypeScript union, and this crashed
schema generation entirely at app bootstrap. Every mocked-Prisma unit
test passed regardless, since none of them build a real schema; only
`test:int`'s real app bootstrap caught it (383/387 tests failing, all at
bootstrap, none at an assertion). Fixed with `{ type: () => String,
nullable: true }`, matching every other nullable-string arg already in
the same file.

## Verification

Backend: 92/92 unit suites, 1521/1521 tests (16 new); integration 4/4
suites, 387/387 (initially red, fixed same session — see above).
`tsc --noEmit`/`eslint` clean. Frontend: new page's own suite 4/4,
`eslint` clean, full lint ratchet confirmed unchanged at exactly 1911.
