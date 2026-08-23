---
id: TP076
type: requirement
feature: catalog-master-data
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: REQ046
related: [PLAN049]
---

# TP076 — Test plan: tax depth (HSN, GST exemption)

Direct test-plan against an already-proven pattern (an additive-column
default-value change, matching `REQ041`/`PLAN046`'s shape) — suggestion
stage skipped per `CLAUDE.md`'s working loop step 4.

## Unit

| Case | Given | When | Then |
|---|---|---|---|
| TC-01 | A new product created via `ProductsService.create()` with no `is_tax_exempt` in the input | `create()` called | Row written with `is_tax_exempt: false` |
| TC-02 | A new product with `is_tax_exempt: true` and `hsn: '9993'` explicitly set | `create()` called | Both values passed through unchanged, not overridden by the default |
| TC-03 | A new service created via `ServicesService.create()` with no `is_tax_exempt` in the input | `create()` called | Row written with `is_tax_exempt: true` |
| TC-04 | A new service with `is_tax_exempt: false` and `hsn: '9993'` explicitly set | `create()` called | Both values passed through unchanged |
| TC-05 (regression) | Every existing `products.service.spec.ts`/`services.service.spec.ts` case | Suite run | Still green — the new columns don't change any pre-existing assertion's shape |

## Static / build gates

| Case | Command | Expected |
|---|---|---|
| TC-06 | `npx prisma validate` | Schema valid with the two new columns |
| TC-07 | `npx prisma migrate deploy` (against `postgres_test`) | Migration applies cleanly |
| TC-08 | `npx tsc --noEmit` | No new errors |
| TC-09 | `npx eslint src/products src/services` | 0 errors, 0 new warnings |
| TC-10 | `npx jest products.service services.service --maxWorkers=2` | All cases above pass |

## Deliberately not covered

No e2e/Playwright spec — no frontend UI reads or writes these fields yet
(`manager/products/*`/`manager/services/*` don't expose them), so there is
no user-facing flow to drive. The acceptance criterion is about the
*default value* a real backend produces, which the unit suite proves
directly against the real Prisma schema types.
