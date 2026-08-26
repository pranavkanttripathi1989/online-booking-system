---
id: CTX-organizations-2026-08-26-req140
type: improvement
feature: organizations
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ140
related: [PLAN180, TP200, TR200]
---

# organizations — REQ140: batch branch-override prefetch for the appointments list preview (2026-08-26)

Seventh slice of the next 10-slice batch (`project-plans/analysis/13-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ140 | [Appointments list-price branch override](../../requirements/organizations/improvement/REQ140-organizations-2026-08-26-appointments-list-price-branch-override.md) |
| implementation-plans | PLAN180 | [implementation plan](../../implementation-plans/organizations/improvement/PLAN180-organizations-2026-08-26-appointments-list-price-branch-override.md) |
| test-plans | TP200 | [verification plan](../../test-plans/organizations/improvement/TP200-organizations-2026-08-26-appointments-list-price-branch-override.md) |
| test-results | TR200 | [verification results — pass](../../test-results/organizations/improvement/TR200-organizations-2026-08-26-appointments-list-price-branch-override.md) |

## What shipped

`REQ055`'s own doc named this exact gap in a dedicated "Deliberate
scope decision" section: the appointments list preview's `service.price`
field never applied a branch's own price override, since a per-row
lookup would mean an N+1 query. `BranchOverridesService
#getManyForPricing()` — one `findMany` with an `OR` of every distinct
`(product_id, clinic_id)` pair on a page, de-duplicated, returned as a
keyed `Map` — closes it. `AppointmentsService#toGraphQL()` gains an
optional fourth `branchOverride` parameter threaded into the existing
`resolveServicePrice()` call; `findAll()` batch-prefetches once per
page. Every other `toGraphQL()` call site (single-row create/update/
read, no N+1 concern) is unchanged.

## Verification

Backend: 93/93 unit suites, 1565/1565 tests (6 new); integration 4/4
suites, 387/387 unchanged (confirms the new module wiring boots
cleanly). `tsc --noEmit`/`eslint` clean. No frontend change — this is a
backend-only display-consistency fix, no contract change on the
`appointments` query's own shape.
