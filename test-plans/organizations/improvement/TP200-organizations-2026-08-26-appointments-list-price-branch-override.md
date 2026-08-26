---
id: TP200
type: improvement
feature: organizations
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN180
related: []
---

# TP200 — Test plan: batch branch-override prefetch for the appointments list preview

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | No pairs, no query | `getManyForPricing([])` | Empty `Map`; `findMany` never called |
| 2 | De-duplication | `getManyForPricing` with a repeated pair | One `OR` clause entry per distinct pair |
| 3 | Map keying | Rows for 2 of 3 requested pairs | Returned `Map` has entries for the 2 matched pairs only, keyed `${product_id}:${clinic_id}` |
| 4 | List batches once per page | Two appointment rows sharing one `(product_id, clinic_id)` pair | `getManyForPricing` called once, with the pair listed per-row (its own dedup responsibility); both rows' `service.price` reflect the resolved override |
| 5 | No-product rows excluded | A row with `product_id: null` | Excluded from the batch-prefetch pairs |
| 6 | Unmatched pair falls back | A pair absent from the batch map | Prices straight from the product, unchanged from before this slice |
| 7 | Other call sites unaffected | Single-row `create`/`update`/status-transition paths | Unchanged — `branchOverride` defaults to `undefined`, same as before this slice |
| 8 | Full suite regression | Backend unit + integration | 93/93 / 1565/1565; integration 4/4 / 387/387 unchanged (module wiring boots cleanly) |
| 9 | Lint/typecheck clean | All touched files | 0 errors |
