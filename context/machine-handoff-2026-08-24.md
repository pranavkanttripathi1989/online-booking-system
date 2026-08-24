---
id: CTX-machine-handoff-2026-08-24
type: context
feature: cross-cutting
created: 2026-08-24
updated: 2026-08-24
status: current
parent: null
related: [REQ017, REQ020, REQ021, REQ019, REQ018, REQ032, PLAN057, PLAN058, PLAN059]
---

# Machine handoff — 2026-08-24

Single-file pointer for resuming this session's work on a different laptop.
`CLAUDE.md` is the authoritative, full-detail source — this document is a
condensed "read this first" layer on top of it, specific to *this* moment
in the project's history, not a replacement for it.

## 1. Where the project stands right now

**Branch:** `master`. **Last 7 commits** (newest first):

```
a20d814 docs: update CLAUDE.md and roadmap for REQ021/REQ019/REQ018 P0 shipments
7c57d84 feat(backend,frontend): patient dedup + merge, and family/dependant profiles (REQ018)
7c162dc feat(backend,frontend): live queue board, queue actions, and unbilled-visits report (REQ019)
2dcef0f feat(backend,frontend): prescription builder, print view, and repeat-Rx (REQ021)
beaaa78 feat(backend,frontend): consultation workspace and clinical records (REQ020)
bb6e63a feat(backend,frontend): session/token scheduling mode and multi-resource booking (REQ017)
aa31246 fix(frontend): wire date-window filters into calendar and appointments list (BUG019)
```

**Phase G (PRD MVP core) is five of six requirements shipped.** The
sequence `REQ017 → REQ020 → REQ021 → REQ019 → REQ018 → REQ032` (dependency
order) is done through `REQ018`'s own P0 subset. Full detail, including
every real bug found along the way, is in `CLAUDE.md`'s Phase G section —
read that before assuming anything below is the complete picture; this
document intentionally does not repeat it in full.

**`REQ032` (subscription plan engine) is the one item left**, and it was
**deliberately paused before any code was written** — not abandoned
mid-slice. It's a different risk category from the four items above: it
needs a global `EntitlementGuard` consulted on every feature-gated resolver
call across the whole app (like the existing `RolesGuard` already in the
shared guard chain), plus Redis-backed caching to avoid an N+1 latency cost
platform-wide. Start with the plan-builder data model and versioning
(`US-PLAN-01`/`02` — additive, lower-risk) before touching the guard chain
itself; see `requirements/subscription-plan-engine/requirement/REQ032-*.md`
and the Phase G section of `CLAUDE.md` for the full reasoning.

## 2. Getting the stack running on a fresh machine

Full detail: `CLAUDE.md` → "Picking this up on another machine". Condensed:

```bash
docker compose up -d                                 # dev stack: postgres, redis, backend, frontend
docker compose --profile test up -d postgres_test    # only if you'll run `npm run test:int`
docker compose --profile e2e up -d                   # only if you'll run the Playwright e2e suite
cd backend  && npm ci && npx prisma generate && npx prisma migrate deploy && npx prisma db seed
cd frontend && npm ci
```

**Then restore both database dumps** (see §3) — a bare `db seed` does not
recreate the accumulated fixture rows (`Sarah Mitchell`'s availability,
`Anita Sharma`, today's now-cleaned-up-but-schema-present `Prescriptions`/
`QueueEntries`/`PatientRelations` tables) that most e2e specs depend on.

**Node:** v24.19.0 (nvm). **Docker Desktop** with Compose v2 syntax
(`docker compose`, not `docker-compose`).

## 3. Restoring the database dumps (do this before running any e2e spec)

Two fresh dumps as of **2026-08-24**, taken *after* `prisma migrate deploy`
had run in both stacks, so both reflect the full 60-table schema (up from
42 before today's `Prescriptions`/`QueueEntries`/`PatientRelations` tables
landed):

- `db-dumps/medibook_db_2026-08-24.sql` — the dev database.
- `db-dumps/medibook_e2e_2026-08-24.sql` — the isolated e2e-profile database.

Full restore commands are in `db-dumps/README.md`; the two things most
likely to trip you up on a fresh machine:

1. **Windows Git Bash rewrites `/tmp/...` paths.** Prefix every
   `docker cp`/`docker exec` command that touches a container's `/tmp/...`
   path with `MSYS_NO_PATHCONV=1`, or the copy silently fails to find the
   file (confirmed live, twice, this session).
2. **Never `docker restart` an e2e-profile container expecting a clean
   reseed.** `medibook_backend_e2e`'s startup command always re-runs
   `seed-e2e.ts`, which is **not idempotent** — a plain restart on top of
   already-seeded data crash-loops on a `Permissions` unique-constraint
   violation (hit live this session). Either restore a dump and restart, or
   use `docker compose --profile e2e up -d --force-recreate` for a
   genuinely fresh reseed — but that command recreates **every** service in
   the compose file, not just the e2e-profiled ones (it also recreated
   `medibook_postgres`/`medibook_redis` live this session; harmless, since
   both are on named volumes not tmpfs, but don't run it expecting it to
   touch only the e2e containers).

## 4. Two environment lessons worth internalizing before touching the backend containers again

Both hit live this session, both cost real debugging time, neither is a
code defect:

**A. `nest start --watch`'s incremental compile can silently serve a stale
GraphQL schema.** Creating several new backend files in quick succession,
immediately followed by edits to the modules that import them, races the
watch process's debounced rebuild. The app restarts using a stale file
snapshot; a new resolver's fields never reach the live schema; and there is
**no error anywhere that says so** — `tsc --noEmit` is clean, the generated
`schema.gql` on disk is already correct, and the startup log says "Nest
application successfully started." The only reliable check: introspect the
*running* server directly and diff against what you just added —

```bash
curl -s -X POST http://localhost:4000/graphql -H "Content-Type: application/json" \
  -d '{"query":"{ __type(name: \"Query\") { fields { name } } }"}'
```

— not the generated file, not the log. Fix: let all edits settle, then one
clean `docker restart medibook_backend`, then re-introspect before writing
a test against the new fields.

**B. A second, distinct transient crash recurs independently of any real
change.** `Error: Cannot find module './prisma/prisma.module'` (or
occasionally `/app/dist/main`) on a container restart — seen at least three
times this session, self-resolving on a second clean restart every time.
If you hit it, don't debug the module path or suspect your own edit; just
restart again.

**Whenever you touch either backend container**, the safe sequence after
any schema or module change is:
```bash
docker exec <container> npx prisma migrate deploy   # if schema.prisma changed
docker exec <container> npx prisma generate          # regenerate that container's own Prisma Client
docker restart <container>
# then re-introspect (A above) before trusting anything
```
Do this **per container** — `medibook_backend` and `medibook_backend_e2e`
each have their own `node_modules`/generated client and apply migrations to
their own database independently. One being current says nothing about the
other (confirmed live: the e2e backend was 4 migrations behind the dev one,
for hours, with no error until something tried to use the missing tables).

## 5. What shipped today, one line each (full detail in each bundle)

| Requirement | What | Bundle |
|---|---|---|
| `REQ021` | Prescription builder, print view, repeat-Rx | `context/prescriptions-2026-08-24-req021/manifest.md` |
| `REQ019` | Live queue board, queue actions, unbilled-visits report | `context/queue-management-2026-08-24-req019/manifest.md` |
| `REQ018` (P0 subset) | Patient dedup+merge, family/dependant profiles | `context/appointments-2026-08-24-req018/manifest.md` |

Each bundle links its own `requirements/`/`implementation-plans/`/
`test-plans/`/`test-results/` documents and records the real bugs found
during the build (not just what was intended) — read the bundle, not just
this summary, before assuming a detail.

## 6. Verify green before starting new work

Exactly what CI runs, plus the integration suite:

```bash
cd backend  && npm test && npm run test:int && npx eslint "{src,apps,libs,test}/**/*.ts" && npx tsc --noEmit
cd frontend && npm run lint && npm test && npm run build
node scripts/check-page-data-wiring.mjs
```

As of this handoff: backend 62 suites / 920 unit tests + 4 suites / 234
integration tests, both green; frontend 8 suites / 68 tests green
(coverage threshold intact — see `CLAUDE.md`'s note on why 2 new component
test files were added today, and why the threshold itself must never be
lowered to paper over a dilution); lint clean on both sides; e2e specs for
today's three slices all green against the real backend.

## 7. Residual open items, in priority order

1. **`REQ032`** — not started; see §1.
2. **Dependant self-scope not widened everywhere.** `REQ018` widened
   `patients.service.ts` (profile view) and `appointments.service.ts`
   (booking) for a dependant's own id. `prescriptions.service.ts`'s
   `patientPrescriptions`, `test-results`, and `messages` still restrict a
   `'patient'` caller to exactly their own `patient_id` — real,
   security-sensitive follow-on work per domain, not a mechanical
   find-and-replace.
3. **Each shipped requirement's own deferred P1/P2 scope** — enumerated in
   full in each requirement doc's "Status" section and its context bundle;
   not repeated here to avoid the two copies drifting out of sync.
4. Everything already logged in `context/open-questions.md` before today,
   unchanged by this session.
