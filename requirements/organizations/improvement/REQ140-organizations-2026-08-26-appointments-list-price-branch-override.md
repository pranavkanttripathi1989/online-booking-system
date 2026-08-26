---
id: REQ140
type: improvement
feature: organizations
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ055
related: [PLAN180, TP200, TR200]
---

# REQ140 — Batch branch-override prefetch for the appointments list-preview price

## Why this slice

`REQ055`'s own doc has a dedicated "Deliberate scope decision" section
naming this exact gap: `appointments.service.ts`'s list-mapping
`toGraphQL()` (the `appointments` query's booking-preview `service.price`
field) does not apply a branch's own price override or `skip` stance,
since wiring a per-row lookup in would mean either an N+1 query per
appointment in a list, or a batched pre-fetch the function had no
natural place to receive. `REQ111` (this same feature, shipped earlier)
built the admin UI for setting overrides but explicitly left this half
of the pair unbuilt, using the identical "N+1 risk, documented as a
named follow-up" phrasing. Confirmed still true before starting: `grep -n
"branchOverride" backend/src/appointments/appointments.service.ts` had
no hits.

## User story

As a front-desk or admin user viewing the appointments list, I want the
displayed price to reflect a branch's own price override (or show no
price at all for a branch that has withdrawn the service) — the same
pricing logic already applied at the two real charge-determining call
sites (Razorpay checkout, counter payment) — so the list preview never
shows a stale or wrong price for a multi-branch org.

## Acceptance criteria

- **Given** a page of appointments whose products have branch overrides
  set, **when** the `appointments` query resolves, **then** each row's
  `service.price` reflects that branch's own override — the same result
  `resolveServicePrice()` would produce at a real charge site, just
  without a payment channel (display-only, matching the existing
  `channel` omission this call site has always had).
- **Given** a page of N appointments referencing only a handful of
  distinct `(product_id, clinic_id)` pairs, **then** exactly one
  additional query is issued for the whole page, not one per row.
- **Given** an appointment with no linked product, **then** it is
  excluded from the batch-prefetch pairs entirely (nothing to price).
- **Given** every other `toGraphQL()` call site (single-row create/
  update/read paths), **then** behaviour is unchanged — no N+1 concern
  exists there, so none of them were touched.

## In scope

- `BranchOverridesService#getManyForPricing(pairs)` — one `findMany`
  with an `OR` of exact `(product_id, clinic_id)` pairs, de-duplicated,
  returning a `Map` keyed `${productId}:${clinicId}`.
- `AppointmentsService#toGraphQL()` gains an optional fourth
  `branchOverride` parameter, threaded into `resolveServicePrice()`.
- `AppointmentsService#findAll()` batch-prefetches the map once per page
  and passes each row's own resolved override in.

## Deliberately out of scope

- Applying the branch override to any single-row `toGraphQL()` call site
  (create/update/read) — no N+1 risk exists there (one row, one
  optional lookup would be cheap), and none of those paths were flagged
  as a gap by `REQ055`'s own doc; left unchanged to keep this slice
  scoped to the one named finding.
- A payer-tariff-aware list preview — the display mapping has never
  known the payment channel or a payer context, matching
  `resolveServicePrice()`'s own documented reasoning for why `channel`
  is omitted at this call site; unrelated to this slice's own scope.
