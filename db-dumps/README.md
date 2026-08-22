# db-dumps

Snapshots of the **development** database (`medibook_db`), committed so the dev
dataset travels between machines.

## Why this is in git

The dev database holds only synthetic data — every address is `@medibook.dev`,
`@test.dev`, `@example.com` or `@westsidehealth.dev`, and the bcrypt hashes are
the seeded demo passwords already printed in `CLAUDE.md`. There is no real
person in here, so the usual "never commit a database dump" rule does not bite.

**That reasoning expires the moment a real patient exists.** Git history keeps a
file after it is deleted, so a dump of production — or of any environment with
real people in it — must never be committed. If this database ever holds real
data, stop dumping it here and move snapshots out-of-band instead.

## What a dump contains

Taken with `--clean --if-exists --no-owner --no-privileges`, so it drops and
recreates objects and can be restored straight over a fresh database:

- all 42 tables with their data,
- the 69 indexes from `BUG005` / migration `20260822130000_add_indexes`,
- the `_prisma_migrations` table — so Prisma treats the migrations as already
  applied and does not try to re-run them.

## Restoring

```bash
docker compose up -d postgres
docker cp db-dumps/<file>.sql medibook_postgres:/tmp/dump.sql
docker exec medibook_postgres psql -U medibook -d medibook_db -f /tmp/dump.sql
```

## Taking a new one

```bash
docker exec medibook_postgres pg_dump -U medibook -d medibook_db \
  --clean --if-exists --no-owner --no-privileges -f /tmp/dump.sql
docker cp medibook_postgres:/tmp/dump.sql db-dumps/medibook_db_$(date +%F).sql
docker exec medibook_postgres rm -f /tmp/dump.sql
```

## You often do not need one

The dataset is small (3 orgs, 4 clinics, 11 users, 8 clinicians, 4 patients,
4 appointments) and `npx prisma migrate deploy && npx prisma db seed` rebuilds
the demo accounts, both tenant organisations and all reference data from
scratch. A dump only preserves rows accumulated from manual QA and e2e runs —
the `E2E Service *` and `e2e-clinician-*` records, which are mostly clutter.

Do **not** dump `medibook_test` (port 5433): it is tmpfs-backed and rebuilt on
every `npm run test:int`.
