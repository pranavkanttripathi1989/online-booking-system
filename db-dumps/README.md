# db-dumps

Snapshots of the **development** database (`medibook_db`) and the **isolated
e2e** database (`medibook_e2e`), committed so both datasets travel between
machines.

## Why this is in git

Both databases hold only synthetic data — every address is `@medibook.dev`,
`@test.dev`, `@example.com`, `@westsidehealth.dev`, `@cityheart.dev`, or
`@e2e.dev`, and the bcrypt hashes are the seeded demo passwords already
printed in `CLAUDE.md`. **One documented exception**: `medibook_db`'s
`Patients` table carries two rows (`pranavkanttripathi1989@gmail.com`) that
are the repo owner's own real contact details entered while manually testing
the app on 2026-08-18 — confirmed with them directly (2026-08-24) that this
is intentional and fine to keep in the dump, not an accidental leak. No other
real person is in either database.

**The "only synthetic data" reasoning expires the moment an actual patient's
data (not the owner's own test entries) exists.** Git history keeps a file
after it is deleted, so a dump of production — or of any environment with a
real *patient's* data in it — must never be committed. If that ever becomes
true, stop dumping here and move snapshots out-of-band instead.

## What a dump contains

Taken with `--clean --if-exists --no-owner --no-privileges`, so it drops and
recreates objects and can be restored straight over a fresh database:

- all 60 tables with their data (as of 2026-08-24 — `REQ021`/`REQ019`/`REQ018`
  added `Prescriptions`/`PrescriptionItems`/`PrescriptionSets`/
  `PrescriptionSetItems`, `QueueEntries`/`QueueEvents`, and
  `PatientRelations`/`PatientMerges` since the count was last 42),
- the 69+ indexes from `BUG005` / migration `20260822130000_add_indexes`
  onward,
- the `_prisma_migrations` table — so Prisma treats the migrations as already
  applied and does not try to re-run them.

**`medibook_db_2026-08-24.sql`** (dev) and **`medibook_e2e_2026-08-24.sql`**
(isolated e2e stack) are both current as of that date, taken *after*
`npx prisma migrate deploy` was run inside both backend containers, so both
include all 4 migrations that landed that day. Superseded dumps (e.g.
`medibook_db_2026-08-23.sql`) are kept for history but should not be restored
onto a codebase newer than their own date without re-running
`migrate deploy` afterward.

## Restoring the dev database

```bash
docker compose up -d postgres
docker cp db-dumps/medibook_db_2026-08-24.sql medibook_postgres:/tmp/dump.sql
docker exec medibook_postgres psql -U medibook -d medibook_db -f /tmp/dump.sql
docker exec medibook_postgres rm -f /tmp/dump.sql
docker restart medibook_backend   # picks up the restored schema cleanly
```

(On Windows Git Bash, prefix the `docker cp`/`docker exec` lines touching
`/tmp/...` with `MSYS_NO_PATHCONV=1` — otherwise Git Bash rewrites the
in-container path as a host Windows path before Docker ever sees it, and the
copy silently fails to find the file.)

## Restoring the e2e database

```bash
docker compose --profile e2e up -d postgres_e2e
docker cp db-dumps/medibook_e2e_2026-08-24.sql medibook_postgres_e2e:/tmp/dump.sql
docker exec medibook_postgres_e2e psql -U medibook -d medibook_e2e -f /tmp/dump.sql
docker exec medibook_postgres_e2e rm -f /tmp/dump.sql
docker restart medibook_backend_e2e
```

**Do not just `docker restart medibook_backend_e2e` (or any e2e container)
expecting it to reseed cleanly on top of existing data** — `seed-e2e.ts` is
not idempotent (confirmed live 2026-08-24: a restart re-ran it against
already-seeded `Permissions` rows and crash-looped on a unique-constraint
violation). The container's own startup command always runs
`migrate deploy && seed-e2e.ts && start:dev` in sequence; if the e2e stack
ever needs a genuinely fresh start rather than a dump restore, use
`docker compose --profile e2e up -d --force-recreate` instead of a plain
restart — but note this recreates **every** service in the compose file by
default, not just the `e2e`-profiled ones (confirmed live: it also recreated
`medibook_postgres`/`medibook_redis`, harmless since their data lives on
named volumes, not tmpfs, but worth knowing before running it casually).

## Taking a new dump

```bash
# dev
docker exec medibook_postgres pg_dump -U medibook -d medibook_db \
  --clean --if-exists --no-owner --no-privileges -f /tmp/dump.sql
docker cp medibook_postgres:/tmp/dump.sql db-dumps/medibook_db_$(date +%F).sql
docker exec medibook_postgres rm -f /tmp/dump.sql

# e2e
docker exec medibook_postgres_e2e pg_dump -U medibook -d medibook_e2e \
  --clean --if-exists --no-owner --no-privileges -f /tmp/dump_e2e.sql
docker cp medibook_postgres_e2e:/tmp/dump_e2e.sql db-dumps/medibook_e2e_$(date +%F).sql
docker exec medibook_postgres_e2e rm -f /tmp/dump_e2e.sql
```

**Before taking a dump, make sure `prisma migrate deploy` has actually run
inside that specific container recently.** Each backend container
(`medibook_backend` vs. `medibook_backend_e2e`) has its own copy of
`node_modules`/generated Prisma Client and applies migrations to its own
database independently — one being up to date says nothing about the other.
Confirmed live 2026-08-24: `medibook_backend_e2e` was 4 migrations behind
(missing `Encounters`/`Prescriptions`/`QueueEntries`/`PatientRelations`
entirely) despite the dev stack having had them for hours, because nothing
had restarted that specific container since. Verify with a quick
`docker exec <container> psql ... -c "\dt"` grep for the table you expect,
not by assuming the two stacks stay in sync.

## You often do not need one

`npx prisma migrate deploy && npx prisma db seed` (dev) or the e2e
container's own startup command rebuild the demo accounts, both tenant
organisations, and all reference data from scratch. A dump only preserves
rows accumulated from manual QA and e2e runs — real accumulated fixtures
(`Sarah Mitchell`'s availability, `Anita Sharma`, the `E2E Service *` /
`e2e-clinician-*` records) that a fresh seed does not recreate, which is
specifically why `CLAUDE.md`'s own "picking this up on another machine"
section says 8 of the e2e specs need the dump restored, not just a reseed.

Do **not** dump `medibook_test` (port 5433): it is tmpfs-backed and rebuilt on
every `npm run test:int`.
