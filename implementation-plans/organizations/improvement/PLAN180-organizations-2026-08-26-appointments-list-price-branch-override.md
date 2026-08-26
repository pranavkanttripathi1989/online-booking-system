---
id: PLAN180
type: improvement
feature: organizations
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ140
related: [TP200, TR200]
---

# PLAN180 — Implementation plan: batch branch-override prefetch for the appointments list preview

## Change

No schema change.

**`backend/src/branch-overrides/branch-overrides.service.ts`**: new
`getManyForPricing(pairs: {productId, clinicId}[])`. De-duplicates
`pairs` into a `Map` keyed `${productId}:${clinicId}` before querying
(a page of appointments routinely repeats the same product/clinic pair
many times), returns an empty `Map` immediately for zero pairs (no
query at all), otherwise one `prisma.productBranchOverrides.findMany({
where: {OR: [...]} })` and maps each returned row into the same shape
`getForPricing()` already returns, keyed the same way.

**`backend/src/appointments/appointments.service.ts`**: constructor
now also injects `BranchOverridesService`. `toGraphQL()` gains an
optional fourth parameter `branchOverride?: BranchPriceOverride | null`,
passed straight into the existing `resolveServicePrice(a.product,
a.patient, undefined, branchOverride)` call (channel stays omitted,
unchanged — this is still a display-only preview, no payment channel is
known here). `findAll()`, after fetching `rows`, filters to rows with a
`product_id`, maps to `{productId, clinicId}` pairs, calls
`getManyForPricing()` once, then passes each row's own
`overridesByKey.get(...)` into `toGraphQL()`. Every other `toGraphQL()`
call site (single-row `create`/`update`/status-transition/pubsub-publish
paths) is unchanged — the new parameter defaults to `undefined`,
identical to today's always-omitted behaviour, matching
`resolveServicePrice()`'s own "no branchOverride = inherit" semantics.

**`backend/src/appointments/appointments.module.ts`**: imports
`BranchOverridesModule` (already exports `BranchOverridesService`, no
providers of its own beyond that + its resolver). No circular
dependency — confirmed via a full `npm run test:int` run (boots the
real `AppModule`), 4/4 suites green.

## Testing

`backend/src/branch-overrides/branch-overrides.service.spec.ts`: 3 new
cases — an empty pair list never queries at all; repeated pairs
de-duplicate into one `OR` clause with one entry per distinct pair; the
returned `Map` is keyed correctly, with a pair that has no matching row
simply absent (not a `null` entry).

`backend/src/appointments/appointments.service.spec.ts`: 3 new cases —
two rows sharing the same `(product_id, clinic_id)` pair trigger exactly
one batch call with the pair listed twice (proving the caller passes the
raw list, not a pre-deduplicated one — deduplication is
`getManyForPricing`'s own job, verified separately above) and both rows'
prices reflect the resolved override; a row with no product is excluded
from the batch-prefetch pairs; a pair absent from the batch map prices
straight from the product, unchanged from before this slice.

Full backend unit suite: 93/93 suites, 1565/1565 tests (6 new).
Integration suite: 4/4 suites, 387/387 unchanged — no schema change, app
boots cleanly with the new module wiring. `tsc --noEmit`/`eslint` clean.

## Documentation

`REQ140` (this requirement), `PLAN180` (this plan), `TP200`/`TR200`
(verification), a context bundle, and index updates across all five doc
roots plus the `organizations` feature README.
