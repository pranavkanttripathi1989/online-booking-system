---
name: medibook-prisma-migrations
description: Change backend/prisma/schema.prisma safely in this repo, where `prisma migrate dev` cannot run and every migration is hand-written SQL. Use when adding or altering a Prisma model, adding a column or index, writing a migration, backfilling data, or when Prisma Client types look stale after a schema change. Triggers on "schema.prisma", "add a model", "add a column", "migration", "prisma generate", "property does not exist" errors, "add an index", "backfill".
metadata:
  origin: project-specific
  vetted: >-
    Written 2026-08-22 from this repository's confirmed constraints — the
    non-interactive `prisma migrate dev` limitation and the dist/-corruption
    footgun are documented in CLAUDE.md from real incidents; the zero-index
    finding (F-13) and the backfill pattern were verified live against the
    running database during the 2026-08-22 audit.
---

# MediBook Prisma migrations

## The constraint that governs everything

**`prisma migrate dev` cannot run non-interactively in this environment** —
confirmed, it refuses even with `--create-only`. Every schema change ships as a
hand-written SQL file:

```
backend/prisma/migrations/<timestamp>_<snake_name>/migration.sql
```

applied with `npx prisma migrate deploy`. There is **no diff/review safety net** —
read every migration end-to-end against the `schema.prisma` diff before applying,
every time.

## The workflow, in order

1. Edit `backend/prisma/schema.prisma`.
2. `npx prisma validate` — catches syntax/relation errors before you write SQL.
3. Hand-write `migration.sql`, matching Prisma's own naming conventions exactly.
4. `npx prisma migrate deploy`.
5. `npx prisma generate`.
6. **`docker restart medibook_backend`** — mandatory, see below.

### Step 6 is not optional

The running `ts-node`/`tsc` watch process caches the old Prisma Client types. An
incremental recompile alone produces stale `property 'x' does not exist` errors
that look like your code is wrong when it isn't. Always restart after `generate`.

### Never run `npm run build` in the watch container

It corrupts `dist/` and crashes the watched app with `MODULE_NOT_FOUND`. The
watch process's own `Found 0 errors` log is the correct way to verify a clean
compile. Recover with `docker restart medibook_backend`.

## Naming conventions — match Prisma or the schema drifts

```sql
-- Tables: quoted PascalCase.  Columns: quoted snake_case.
ALTER TABLE "Products" ADD COLUMN "client_org_id" TEXT;

-- FK: "Table_column_fkey"
ALTER TABLE "Products" ADD CONSTRAINT "Products_client_org_id_fkey"
  FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index: "Table_column_idx" -- must match what Prisma generates for @@index,
-- or migrate diff will try to drop and recreate it forever.
CREATE INDEX "Appointments_clinician_id_appointment_time_idx"
  ON "Appointments"("clinician_id", "appointment_time");
```

## Indexes are mandatory on new tables

`grep -c "@@index" schema.prisma` returned **0** across 41 models at audit time.
**PostgreSQL does not auto-index foreign-key columns** — a `@relation` gives you
referential integrity and nothing else; it indexes the referenced PK, not the
referencing column. Every list query in the product was a sequential scan.

Closed 2026-08-22 by `BUG005` / `20260822130000_add_indexes`: **69 indexes across
30 of the 41 models.** The rules below are what the measurements actually showed,
and two of them contradict the obvious advice.

**Standing rule** (`REQ035`, a code-review gate): a migration creating a
tenant-scoped table **must** declare its indexes in the same file. Derive them
from the real `where` / `orderBy` clauses in the service, then:

1. **Equality columns first, range or sort column last.** One composite index
   then serves both the filter and the ordering, and the sort node disappears
   from the plan entirely. Measured: the clinician-schedule query's `top-N
   heapsort` vanished, buffers 2,755 → 34.
2. **Do NOT lead a composite with `client_org_id`, and do not index it alone.**
   This is the counter-intuitive one. Measured at 50,000 appointments, the tenant
   predicate matches ~20% of rows, so a sequential scan is genuinely optimal and
   the planner correctly ignores any index on it — identical buffer counts before
   and after. Tenant-scoping columns only help *led by* a selective column. Lead
   with `clinician_id` / `clinic_id` / `patient_id`.

   **But do not over-apply this into "never lead with an unselective column."**
   Selectivity is only one reason to index; **ordered access for a paginated list
   is another.** `Appointments(is_deleted, appointment_time)` leads with a boolean
   that is `false` for effectively every row, and the planner uses it anyway —
   measured as an Index Scan Backward at 130 buffers, versus a 2,753-buffer
   sequential scan plus a 50,000-row sort — because it can walk in
   `appointment_time` order and stop at the `LIMIT`. The test is not "is the
   leading column selective" but "does this index let the planner avoid either a
   full scan **or** a sort." `client_org_id` fails both on `Appointments`, and for
   a further reason: it is not a column on that table at all, it is joined through
   `Clinics`, so no index on `Appointments` could serve it.
3. **Do not blanket-index every foreign key.** That would have produced ~120
   indexes here instead of 69, most never used by any query the app issues, each
   paying write amplification on every insert forever. Index a bare FK only where
   a query filters on it alone, or where a cascade delete would otherwise scan
   the child table.
4. **Check which of two similar columns the code actually uses.** `Appointments`
   carries both `appointment_date` and `appointment_time`; the services
   overwhelmingly filter and sort on **`appointment_time`**. Indexing the
   more-obvious-looking `appointment_date` would have produced indexes the
   planner ignores.
5. **Skip small global reference tables** (`Languages`, `RoomTypes`,
   `ClinicianTypes`, `EmailTemplates`). One or two pages total — an index scan is
   strictly slower than the sequential scan the planner will rightly choose.
6. **`CREATE INDEX`, not `CONCURRENTLY`.** Prisma wraps each migration in a
   transaction and `CONCURRENTLY` cannot run inside one. Fine at current volume;
   split it out before running against a populated production database.
7. **Length-check every generated name against PostgreSQL's 63-byte identifier
   limit.** Over it, PostgreSQL silently truncates and `migrate diff` then reports
   permanent drift.

**Verify with `EXPLAIN (ANALYZE, BUFFERS)` at realistic volume — do not assume.**
The dev database holds a handful of appointments, where a sequential scan really
is fastest, so verifying there proves nothing. Seed a *scratch* database (keep dev
data clean), then read **buffer counts, not milliseconds** — a dev machine under
load makes timings noisy while buffer hits stay deterministic.

To get "before" and "after" on the same data, set `enable_indexscan`,
`enable_bitmapscan` and `enable_indexonlyscan` to `off` rather than comparing
against a pre-migration database — that holds volume and distribution constant so
index availability is the only variable.

When bulk-seeding for this, never pick parents with
`JOIN LATERAL (SELECT id FROM ... LIMIT 1 OFFSET (g % n))` — it is O(n × offset)
and re-scans the parent table per row (it ran 7 minutes and committed nothing
here). Hoist the IDs once instead:

```sql
SELECT array_agg(id) INTO doc_ids FROM "Clinicians";
-- then: doc_ids[1 + (g % array_length(doc_ids,1))]
```

Full per-table catalogue:
`project-plans/technical-plans/04-data-model-evolution.md` §2.2. Measured results
and the one deliberate negative: `requirements/platform-nfr/bug/BUG005-*`.

## The established backfill pattern

When adding a tenant column to an existing table, copy
`20260821000000_products_client_org_id/migration.sql`: add column → add FK →
backfill from real relational evidence → leave genuinely-unknowable rows `NULL`.

```sql
UPDATE "Products" p SET "client_org_id" = sub.client_org_id
FROM ( SELECT DISTINCT ON (a."product_id") a."product_id", c."client_org_id"
       FROM "Appointments" a JOIN "Clinics" c ON c."id" = a."clinic_id"
       WHERE a."product_id" IS NOT NULL AND c."client_org_id" IS NOT NULL
       ORDER BY a."product_id", a."created_at" ASC ) sub
WHERE p."id" = sub."product_id" AND p."client_org_id" IS NULL;
```

Rows left `NULL` are visible only to platform roles — the established default for
records predating an org linkage. Document that choice in the migration comment.

## Schema conventions in this repo

- **UUID primary keys** (`@id @default(uuid())`) — the vendored `postgres-patterns` skill recommends bigint PKs; that conflicts with this schema and does not apply.
- **Money is `Int` paise**, never `Float`, never `Decimal`. Convert at the resolver boundary only.
- **Soft delete**: `is_deleted Boolean @default(false)` — filter it in every query.
- **India addresses**: structured `{line1, line2, city, state, pincode, country}` for new entities. `Clinics` still uses the older flat Western shape — a known, documented inconsistency; don't silently "fix" it in an unrelated slice.
- **Timestamps**: `created_at DateTime @default(now())`, UTC storage.

## Constraints worth enforcing in the database, not the service

Application-level checks lose to concurrency. Where correctness actually matters:

- **Double-booking**: `EXCLUDE USING gist` on `(clinician_id, tstzrange)` — the current `assertSlotFree()` is a `findFirst` inside a `READ COMMITTED` transaction, so two concurrent bookings can both pass.
- **Signed-encounter immutability**: a `BEFORE UPDATE` trigger. Medico-legal requirement; an application check is not a substitute.
- **Gapless invoice numbering**: a sequence table with row-level locking, per `(branch_id, series, financial_year)`.
- **Append-only ledgers** (`StockLedger`): never a mutated balance column.

SQL for each: `project-plans/technical-plans/` §`01-phase1-mvp` and `04-data-model-evolution`.

## Before you commit

- [ ] `npx prisma validate` passes.
- [ ] Migration SQL read end-to-end against the schema diff.
- [ ] Indexes declared for every new tenant-scoped table.
- [ ] Backfill leaves unknowable rows NULL, with a comment explaining why.
- [ ] `prisma generate` run, then `docker restart medibook_backend`.
- [ ] Backend tests green — run them **on the host** (`cd backend && node_modules/.bin/jest`), not in the container: a single spec exceeded 400s in `medibook_backend` versus 42s host-side.
