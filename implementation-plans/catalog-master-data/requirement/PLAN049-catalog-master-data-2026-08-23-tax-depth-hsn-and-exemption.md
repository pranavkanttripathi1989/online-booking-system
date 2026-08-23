---
id: PLAN049
type: requirement
feature: catalog-master-data
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ046
related: [PLAN047]
---

# PLAN049 — Implementation plan: tax depth (HSN, GST exemption)

## Files touched

- `backend/prisma/schema.prisma` (`Products.hsn`, `Products.is_tax_exempt`)
- `backend/prisma/migrations/20260823060000_products_tax_depth/migration.sql` (new)
- `backend/src/products/dto/product.input.ts`
- `backend/src/products/entities/product.entity.ts`
- `backend/src/products/products.service.ts`
- `backend/src/products/products.service.spec.ts`
- `backend/src/services/dto/service.input.ts`
- `backend/src/services/entities/service.entity.ts`
- `backend/src/services/services.service.ts`
- `backend/src/services/services.service.spec.ts`

## Design decisions

1. **Module boundary as the tax-treatment signal, not a heuristic on
   `duration_minutes`.** The AC needs "consultation service → exempt by
   default, retail item → taxed by default." `duration_minutes` is
   optional on both DTOs and not a reliable discriminator (a retail item
   could technically have one set, nothing prevents it). The actual,
   already-real discriminator is which resolver/service created the row:
   `ServicesService` only ever backs `manager/services/*` (clinical), and
   `ProductsService` only ever backs `manager/products/*` (retail/stock).
   Defaulting in each service's own `create()` is simpler than adding a
   shared heuristic function and just as correct, since the two creation
   paths already don't overlap.
2. **No `gst_rate` column added.** Checked `REQ016`'s own "Data model
   impact" section before adding one — it lists `hsn`/`is_tax_exempt` for
   `Products`/`Services` and `gst_rate` only for the separate `Drugs`
   table. Adding a rate column here would be scope creep past this
   specific acceptance criterion, however plausible it reads from the
   AC's prose alone.
3. **`update()` never re-applies the default.** Both `UpdateProductInput`/
   `ServiceInput` already treat every optional field as "if provided,
   overwrite; if omitted, leave alone" (Prisma's `undefined`-means-
   untouched convention, already used for `name`/`description`/etc. on
   these exact two services) — `hsn`/`is_tax_exempt` follow the same rule
   for consistency, not a special case.

## Verification

- `npx prisma migrate deploy` against `postgres_test` (port 5433) — the
  migration applied cleanly (alongside two other pending migrations from
  earlier sessions that had not yet reached that database either).
- `npx prisma generate` — Prisma Client regenerated, `hsn`/`is_tax_exempt`
  present on the `Products` delegate's types.
- `npx jest products.service services.service --maxWorkers=2` — 65/65 pass
  (4 new: opposite defaults + explicit-override for each service).
- `npx tsc --noEmit` — 0 new errors (same 2 pre-existing, unrelated errors
  as `PLAN048` — `@nestjs/schedule`/`helmet` missing types, neither touched
  by this slice).
- `npx eslint src/products src/services` — 0 errors, 0 warnings.
- `npx prisma validate` — schema valid.
