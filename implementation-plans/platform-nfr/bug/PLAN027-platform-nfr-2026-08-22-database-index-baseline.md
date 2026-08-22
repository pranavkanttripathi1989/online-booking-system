---
id: PLAN027
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-22
status: done
parent: BUG005
related: [F-13, REQ035, TECH006, TP054, TR053]
---

# PLAN027 — Database index baseline (F-13)

## Approach taken, and why not the obvious one

The obvious approach is "add an index on every foreign key." That was rejected.
It would have produced roughly 120 indexes, most never used by any query the
application actually issues, each one paying write-amplification and bloat cost
on every insert and update for no read benefit. Unused indexes are not free.

Instead, every index was derived from the real query shapes:

1. Read the `where`, `orderBy`, and `include` clauses of all 28 domain services
   under `backend/src/**/*.service.ts`.
2. Group them into (equality columns, range/sort column) pairs.
3. Emit one composite index per distinct hot shape, equality columns first and
   the range or sort column last, so a single index satisfies both the filter and
   the ordering and the sort node disappears from the plan.
4. Emit a single-column index for a foreign key **only** where a query filters on
   it alone, or where a cascade delete would otherwise scan the child table.

That yielded 69 indexes across 30 of the 41 models. Eleven models got none, on
purpose: small global reference tables (`Languages`, `RoomTypes`,
`ClinicianTypes`, `EmailTemplates`) where the whole table is one or two pages
and any index scan is strictly slower than the sequential scan the planner will
correctly choose anyway.

## Generation was scripted, with a guard that earned its keep

The 69 `@@index` lines were inserted into `schema.prisma` by a script rather than
by hand, because 69 hand-edits across 30 models across a 1,071-line schema is a
transcription-error machine. The script validated each entry against the model's
actual declared columns before writing.

That guard caught a real error: a drafted `EmailTemplates.client_org_id` index
referenced a column that does not exist. Prisma's own `validate` would also have
caught it, but only after the file was already written. Keep the guard for any
future bulk schema edit.

The migration SQL was generated from the same source of truth, so the
`schema.prisma` declarations and the `CREATE INDEX` statements cannot disagree —
confirmed afterwards by `prisma migrate diff` reporting zero index-related drift.

## Index naming

`"Table_col1_col2_idx"`, matching what Prisma itself generates for `@@index`, so
that a future `prisma migrate diff` sees the hand-written migration and the
schema declaration as identical and does not try to drop and recreate all 69.
Every generated name was length-checked against PostgreSQL's 63-byte identifier
limit — over that, PostgreSQL silently truncates, which would then read as
permanent drift.

## Verification strategy

`technical-plans/04-data-model-evolution.md` §2.2 says "verify with `EXPLAIN
ANALYZE` at seeded volume — do not assume." The dev database holds 4
appointments, where a sequential scan is legitimately the fastest plan, so
verifying there would have proved nothing.

A scratch database `medibook_idxtest` was therefore created (deliberately
separate, so the dev database's data was never polluted with 50,000 synthetic
rows), all 24 migrations applied, and seeded to 5 orgs / 20 clinics /
100 clinicians / 60 rooms / 5,000 patients / 50,000 appointments, then
`ANALYZE`d.

"Before" was produced by setting `enable_indexscan`, `enable_bitmapscan` and
`enable_indexonlyscan` to `off` on the same seeded data. This is better than
measuring the real pre-migration database because it holds the data volume and
distribution constant, so the only variable is index availability.

Results, including one honest negative, are in `BUG005`. The headline: shared
buffer hits on the clinician-schedule query fell from 2,755 to 34.

## Two seeding attempts — the first one failed

The first seed used `JOIN LATERAL (SELECT id FROM "Clinicians" ORDER BY id
LIMIT 1 OFFSET (g % 100))` to pick a random parent per row. That pattern is
O(n × offset): PostgreSQL re-scans and re-sorts the parent table for every
generated row. It ran for seven minutes, was killed, and committed zero rows.

The working version hoists each parent table's IDs into an array once
(`SELECT array_agg(id) INTO doc_ids FROM "Clinicians"`) and indexes into it
(`doc_ids[1 + (g % array_length(doc_ids,1))]`). Same distribution, one scan per
parent table instead of one per row. 50,000 rows in well under a minute.

Worth recording because bulk-seeding for performance verification is going to
happen again for every phase of the PRD work.

## Sequencing note

F-13 is one of the two hard prerequisites named in
`technical-plans/00-foundation-hardening.md` (the other being the `orgScope`
helper, landed with BUG004). The PRD adds roughly 40 new tenant-scoped tables;
each would have inherited the zero-index default. Landing the baseline and the
derivation method first means the next 40 tables are indexed as they are built
rather than retrofitted.

The gate that would *enforce* that is still not built — see BUG005 follow-ups.
