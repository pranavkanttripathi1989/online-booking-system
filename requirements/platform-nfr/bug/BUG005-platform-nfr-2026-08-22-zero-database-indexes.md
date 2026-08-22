---
id: BUG005
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-22
status: done
parent: REQ035
related: [F-13, TECH006, REQ035, PLAN027]
---

# BUG005 — The database declared zero indexes across all 41 models

## Severity

S2. Not a correctness or security defect — a scalability wall. It is invisible
at the current dev-database volume (4 appointments) and becomes the dominant
cost of every page load at pilot volume.

## Summary

`backend/prisma/schema.prisma` declared **41 models and not one `@@index`**.
Confirmed live against the running database before the fix:

```
$ psql -d medibook_db -c "SELECT count(*) FROM pg_indexes
    WHERE schemaname='public' AND indexname LIKE '%_idx';"
 0
```

The only indexes that existed were the ones PostgreSQL creates implicitly for
`PRIMARY KEY` and `UNIQUE` constraints. **PostgreSQL does not index foreign-key
columns automatically** — a common and load-bearing misconception. Declaring
`clinician_id String` with a `@relation` gives you referential integrity and
nothing else: every "appointments for this clinician" query was a full
sequential scan of the entire `Appointments` table.

## Why the existing test suite could never catch this

The suite is green at 602 tests and would stay green with zero indexes forever.
Unit tests mock the Prisma client entirely, so no SQL is ever planned or
executed. The e2e suite runs against a dev database holding single-digit row
counts, where a sequential scan genuinely *is* the fastest plan and the
resulting page is fast. Nothing in the pyramid observes a query plan. This is
a defect class that only a deliberate `EXPLAIN`-at-volume check finds, which is
why the fix below includes that measurement rather than asserting an
improvement.

## Reproduction and measured impact

A scratch database (`medibook_idxtest`) was created, all 24 migrations applied,
and seeded to realistic single-clinic-chain volume: 5 organizations,
20 clinics, 100 clinicians, 60 rooms, 5,000 patients, **50,000 appointments**,
then `ANALYZE`d.

The four queries below are the real hot paths, taken from the actual `where` /
`orderBy` clauses in `backend/src/**/*.service.ts` — not invented benchmarks.
"Before" was measured on the same seeded data with `enable_indexscan`,
`enable_bitmapscan` and `enable_indexonlyscan` set to `off`, which reproduces
the pre-fix plan exactly while holding the data constant.

| Query (real service code path) | Before | After | Buffers before → after |
|---|---|---|---|
| Q1 clinician schedule, 30-day window, newest first | 154.6 ms (Seq Scan + top-N heapsort) | **0.52 ms** (Index Scan Backward) | 2755 → **34** |
| Q2 clinic schedule, 7-day window, ascending | 72.0 ms (Seq Scan + quicksort) | **3.8 ms** (Index Scan) | 2753 → **77** |
| Q3 patient appointment history | 100.7 ms (Seq Scan) | **2.8 ms** (Bitmap Index Scan) | 2753 → **20** |
| Q4 org-scoped join via `Clinics.client_org_id` | 21.5 ms | 52.1 ms | 610 → 610 |

**Read the buffer column, not the milliseconds.** This host was heavily loaded
during measurement (load average fluctuated between 45 and 190), so wall-clock
timings carry real run-to-run noise. Shared-buffer hit counts are deterministic
and load-independent, and they show the actual work eliminated: 81× less on Q1,
36× on Q2, 138× on Q3.

**Q4 is a deliberate negative result, recorded rather than hidden.** The
org-scoped join shows no improvement and identical buffer counts, because the
`client_org_id` predicate matches roughly 20% of all rows at this data
distribution. A sequential scan genuinely is the optimal plan there, and the
planner correctly chooses it with the indexes present. The lesson is that
tenant-scoping predicates are *not* selective enough to index on their own —
they only help in combination with a selective column, which is exactly why the
composite indexes below lead with the selective column (`clinician_id`,
`clinic_id`, `patient_id`) rather than with `client_org_id`.

## Fix

69 indexes across 30 models, in `schema.prisma` plus the hand-written migration
`prisma/migrations/20260822130000_add_indexes/migration.sql`.

Every index was derived by reading the real `where` and `orderBy` clauses in
`backend/src/**/*.service.ts`, not from a blanket "index every FK" rule. Three
decisions are worth recording:

1. **`appointment_time`, not `appointment_date`, is the hot ordering column.**
   The schema carries both. The services overwhelmingly filter and sort on
   `appointment_time`; `appointment_date` is used mainly for the patient-history
   view. The composite indexes follow the code, so `Appointments` has
   `(clinician_id, appointment_time)` and `(clinic_id, appointment_time)` but
   `(patient_id, appointment_date)`. Indexing the more obvious-looking
   `appointment_date` everywhere would have produced indexes the planner
   ignored.
2. **Column order within each composite is equality-first, range-second**, so a
   single index serves both the filter and the sort and the sort disappears from
   the plan entirely. Q1's `top-N heapsort` vanishing in the "after" plan is
   that working.
3. **`CREATE INDEX`, not `CREATE INDEX CONCURRENTLY`.** Prisma wraps each
   migration in a transaction and `CONCURRENTLY` cannot run inside one. At
   current table sizes the brief write lock is irrelevant. This is called out in
   the migration file's own header comment so that whoever re-runs it against a
   populated production database knows to split it out first — see
   `technical-plans/04-data-model-evolution.md` §2.2.

One error was caught during authoring and is worth recording because it would
have produced a migration that fails on apply: an `EmailTemplates.client_org_id`
index was drafted, but that column does not exist — `EmailTemplates` is a small
global reference table with no tenant column. A column-existence guard in the
generation script caught it before anything was written. Any future bulk index
work should keep that guard.

### A nuance the first draft of this finding got wrong

The rule above ("don't lead with an unselective column") is right about
`client_org_id` and wrong as a general principle, and the difference is worth
stating because a future reader following the simplified version would delete a
working index.

`Appointments(is_deleted, appointment_time)` leads with a boolean that is `false`
for effectively every row. By pure selectivity reasoning it should be useless.
Measured, the planner picks it: an **Index Scan Backward at 130 buffers**, against
a 2,753-buffer sequential scan plus a 50,000-row sort. It earns its place not by
narrowing rows but by supplying **pre-sorted access** so the sort node disappears
and the `LIMIT` can stop early — which is exactly what a paginated list query
needs.

So the real test is not "is the leading column selective" but **"does this index
let the planner avoid a full scan *or* a sort."** `client_org_id` fails both on
`Appointments` — and for an additional reason worth noting: it is not a column on
that table at all. It is reached by joining through `Clinics`, so no index on
`Appointments` could ever serve it. Tenant scoping on indirectly-scoped models
has to be served by an index on the *parent* table's scoping column plus the join
key, which is what `Clinics(client_org_id)` and `Appointments(clinic_id, ...)`
do together.

## Verification

- `npx prisma validate` — clean.
- `npx prisma migrate deploy` against the dev database — 24/24 applied, "Database
  schema is up to date!".
- `SELECT count(*) FROM pg_indexes WHERE indexname LIKE '%_idx'` — **69**.
- `SELECT count(*) FROM pg_index WHERE NOT indisvalid` — **0** (no failed builds).
- `prisma migrate diff` schema-vs-database — **zero index-related lines**, so the
  69 `@@index` declarations and the 69 live indexes agree exactly. (33 lines of
  unrelated pre-existing drift remain — foreign keys and a `UserProfiles.staff_status`
  nullability difference. Pre-existing, not introduced here, and filed separately
  rather than silently folded into this fix.)
- Backend suite re-run after `prisma generate` + container restart.
- `EXPLAIN (ANALYZE, BUFFERS)` before/after at 50,000 appointments, above.

## Follow-ups deliberately not done here

- **The 33 lines of pre-existing schema-vs-database drift** (missing foreign keys,
  `staff_status` nullability). Real, but a separate change with a separate risk
  profile; folding it into an index migration would make both harder to review.
- **No index-coverage regression gate.** Nothing stops the next model from landing
  with zero indexes. `technical-plans/00-foundation-hardening.md` proposes the CI
  check; it is not built, so this defect class can recur.
- **Q4's unselective-tenant-predicate finding** should inform the ~40 new
  tenant-scoped tables the PRD adds: index the selective column first.
