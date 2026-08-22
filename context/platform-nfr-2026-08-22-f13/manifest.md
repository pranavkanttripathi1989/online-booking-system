---
id: CTX-platform-nfr-2026-08-22-f13
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-22
status: done
parent: BUG005
related: [F-13, REQ035, TECH006]
---

# platform-nfr — F-13, database index baseline (2026-08-22)

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG005 | [zero-database-indexes](../../requirements/platform-nfr/bug/BUG005-platform-nfr-2026-08-22-zero-database-indexes.md) |
| implementation-plans | PLAN027 | [database-index-baseline](../../implementation-plans/platform-nfr/bug/PLAN027-platform-nfr-2026-08-22-database-index-baseline.md) |
| test-plans | TP054 | [database-index-verification](../../test-plans/platform-nfr/bug/TP054-platform-nfr-2026-08-22-database-index-verification.md) |
| test-results | TR053 | [database-index-verification](../../test-results/platform-nfr/bug/TR053-platform-nfr-2026-08-22-database-index-verification.md) |
| test-suggestions | — | skipped, per the conditional rule (well-scoped fix, prescribed verification method) |

## What changed in the code

| File | Change |
|---|---|
| `backend/prisma/schema.prisma` | 69 `@@index` declarations across 30 of 41 models |
| `backend/prisma/migrations/20260822130000_add_indexes/migration.sql` | 69 `CREATE INDEX` statements, Prisma-conventional names, header documenting the non-`CONCURRENTLY` decision |

## Outcome

0 indexes → 69. Clinician-schedule query: 2,755 shared buffer hits → 34.
One deliberate negative result recorded (org-scoped join, unchanged plan) because
it teaches the column-ordering rule for the ~40 tenant-scoped tables the PRD adds.

## What this does not do

- No CI gate — the next model can still land with zero indexes.
- Does not touch the 33 lines of pre-existing schema-vs-database drift it surfaced.
- No concurrency or sustained-load testing.

F-13 was the second of the two hard prerequisites in
`technical-plans/00-foundation-hardening.md`; the first (`orgScope`) landed with
BUG004.
