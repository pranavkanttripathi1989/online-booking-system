---
id: TR055
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-22
status: pass
parent: TP056
related: [BUG008, PLAN029, F-26, F-22, F-29]
---

# TR055 — CI pipeline and prerequisite verification results

Executed 2026-08-22 on the host (Node v24.19.0, nvm) against
`medibook_postgres_test` and `medibook_redis`.

## F-22 — frontend lint

| Case | Result | Evidence |
|---|---|---|
| TC-01 reproduce | **pass** | `Invalid option '--ext' - perhaps you meant '-c'?` — the script had never been able to run |
| TC-02 plugin fix collapses false positives | **pass** | `no-unused-vars` **2,862 → 167**. The 2,695 removed were imports used only in JSX |
| TC-03 real errors | **pass** | exactly 12: 11 × `jsx-a11y/no-autofocus`, 1 × `jsx-a11y/media-has-caption` |
| TC-04 each site inspected | **pass** | 4 modal `Dialog`s, 3 inline add/edit rows, 4 login-wizard step transitions — all legitimate |
| TC-05 lint passes | **pass** | `npm run lint` → **exit 0**, first time in the project's history |
| TC-06 stale directives | **pass** | 2 found and removed (`calendar/index.jsx:560`, `manager/products/index.jsx:129`) — they had accumulated *because* the script never ran |
| TC-07 frontend still builds | **pass** | `npm run build` succeeded (5m 3s); `npm test` 4/4 |

Final: **0 errors, 197 warnings**, ceiling pinned at 197.

TC-02 is the load-bearing one. The reduction came from correcting the analysis,
not from switching a rule off — the 167 that remain are genuinely unused
variables and are still reported.

## F-29 — backend suite safe to run unattended

| Case | Result | Evidence |
|---|---|---|
| TC-08 reproduce OOM | **pass** | bare `npm test` killed, **exit 137**, before completing |
| TC-09 no `--forceExit` needed | **pass** | after the Redis hook the suite completed and exited; 120/120 in 94s (down from 117s) |
| TC-10 **handle probe** | **pass** | `process._getActiveHandles()` after `app.close()` → exactly `Socket(stdout fd=1)` and `Socket(stderr fd=2)`. `--detectOpenHandles` independently reported zero |
| TC-11 no bcrypt timeouts | **pass** | `account` and `staff` green in the full run |
| TC-12 production cost guarded | **pass** | 5 tests: default 12; throws below 12 when `NODE_ENV=production`; allows 14; rejects `"twelve"` |
| TC-13 faster after fix | **pass** | `--runInBand` **118s** vs 182s at 2 workers vs OOM at default |

### The Redis leak was a production bug

`RedisModule` created an ioredis client and never closed it. `PrismaService` had
always had `onModuleDestroy`; Redis had no hook at all. Beyond the test symptom,
`SIGTERM` left the connection dangling and `app.close()` never resolved, so
containers relied on the orchestrator's kill timeout. `main.ts` now calls
`enableShutdownHooks()`, without which Nest never listens for the signal.

### Why `forceExit: true` is still set, and why that is not a shrug

After the fix Jest still printed "did not exit". TC-10 shows there is nothing
left holding the loop — the residue is Jest's own module-registry teardown
exceeding its one-second wait, measured at ~15s of dead time. Exit code was
already 0 and the process did terminate on its own. `forceExit` is set **in the
config with that evidence beside it**, because Jest's wording ("tests leaking due
to improper teardown") will otherwise send the next person hunting a leak that
does not exist.

## CI

| Case | Result | Evidence |
|---|---|---|
| TC-14 YAML valid | **pass** | parsed with `js-yaml`: 5 jobs — `backend` (7 steps), `schema` (6), `integration` (5), `frontend` (6), `structure` (3) |
| TC-15 every command runs locally | **pass** | see the table below |
| TC-16 what is NOT verified | **recorded** | see below |

| Workflow command | Local result |
|---|---|
| `npx eslint "{src,apps,libs,test}/**/*.ts"` | exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `npm test` (backend) | 650/650, 51 suites |
| `npx prisma validate` | valid |
| `npx prisma migrate deploy` | applied to a clean database |
| `npx prisma migrate diff … --exit-code` | runs; reports the known drift |
| `npm run test:int` | 120/120, 3 suites |
| `npm run lint` (frontend) | exit 0 |
| `npm test` (frontend) | 4/4 |
| `npm run build` (frontend) | succeeded |
| `node scripts/check-page-data-wiring.mjs` | exit 0 |

### TC-16 — stated rather than implied

- **The workflow has never executed on GitHub.** There is no run to link. What is
  proven is that the file parses and every command in it passes locally with the
  identical invocation.
- GitHub-specific behaviour is unverified from here: service-container
  networking, `actions/setup-node` cache hits, and `npm ci` on a clean runner.
- The `migrate diff` step is `continue-on-error` because of 33 lines of
  pre-existing drift (`TR053` TC-05) — foreign-key ordering and
  `UserProfiles.staff_status` nullability. It reports; it does not gate.

## The structural gate

| Case | Result | Evidence |
|---|---|---|
| TC-17 detects fabricated pages | **pass** | **7 previously-unknown**, on top of the 3 already documented |
| TC-18 conservative | **pass** | no false positives; files taking props/context/router params excluded |
| TC-19 passes on current tree | **pass** | `✓ 10 known-fabricated, 0 new`, exit 0 |
| TC-20 **fails on a NEW page** | **pass** | a throwaway `__gatecheck/index.jsx` rendering a `<Table>` from a hardcoded array → **exit 1**, named in the output. Probe deleted; gate back to exit 0 |
| TC-21 allowlist cannot go stale | **pass** | prints a note when an entry no longer looks fabricated |

TC-20 was executed, not reasoned about. A regression gate that has never been
seen to fail is not known to work.

### What TC-17 found

Seven pages that render fabricated data **while a real backend module for that
domain already exists**: `analytics`, `clinician/Patients` (exports
`MOCK_PATIENTS`), `manager/Billing`, `patient/Appointments`, `public/landing`,
`staff/Appointments`, `staff/Dashboard`.

Priority 3's sweep missed all seven because it grepped for `mocks/store` imports
and none of these import it — the same blind spot that hid
`NotificationBell.jsx` and `clinicians/detail.jsx`. They are allowlisted with
per-entry notes and reported here; **wiring them is not part of this slice.**

## One thing went wrong during verification, and it changed the workflow

The first drift check I wrote used
`--from-migrations … --shadow-database-url "$DATABASE_URL"`, pointing the shadow
database at the target. **Prisma uses the shadow database destructively.** It
dropped `_prisma_migrations` while leaving the tables, and the next
`npm run test:int` failed at global setup with `P3005 — the database schema is
not empty`. The integration suite could not start until the schema was dropped
by hand.

Two changes came out of it, and neither would exist if this had only been
reasoned about rather than run:

1. **The workflow now uses `--from-schema-datasource`**, which introspects the
   already-migrated database and needs no shadow database at all. The comment
   above it says explicitly not to switch back, and why. Had this shipped
   unverified, CI would have silently destroyed its own migration state on every
   run of the `schema` job — and the `integration` job, which uses the same
   database name, would have failed with an error pointing at the wrong place.
2. **`global-setup.ts` now drops and recreates the schema before migrating.** The
   suite owns that database and rebuilds it every run, so starting from empty is
   free, and it self-heals this class of poisoning instead of requiring manual
   repair. The reset deliberately does **not** swallow errors — an earlier draft
   did, and that turned a clear "cannot reach the database" into a confusing
   P3005 two steps later. It also issues `DROP SCHEMA` and `CREATE SCHEMA` as
   separate calls, because Prisma sends them as prepared statements and rejects a
   semicolon-separated pair.

Recorded rather than quietly fixed: it is direct evidence for this plan's own
TC-15, that "every command runs locally" is a real check and not a formality.

## Regression

| Case | Result |
|---|---|
| TC-22 backend unit suite | **pass** — 650/650, 51 suites (up from 645/50; +5 bcrypt-cost) |
| TC-23 tenancy matrix | **pass** — 120/120, unaffected by the shutdown-hook change |
| TC-24 lint + typecheck + prisma validate | **pass** — all clean |

## Caveats

- Wall-clock figures are indicative; the host was under load throughout.
- The frontend build takes ~5 minutes here and will dominate CI time.
- 197 frontend warnings and 167 unused variables remain as declared debt.
