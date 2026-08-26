---
id: REQ142
type: improvement
feature: test-coverage-audit
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ013
related: [PLAN182, TP202, TR202]
---

# REQ142 — F-28 residue: confirm which e2e specs target which stack

## Why this slice

`project-plans/analysis/02-findings-register.md` F-28's own prior status line:
*"What's not confirmed: whether every e2e spec actually runs against
[the isolated e2e] stack rather than the shared dev database... Not
independently re-investigated spec-by-spec."* This slice does exactly
that — investigation-heavy, per its own batch-plan scoping, with code
changes only if a real gap surfaced.

## What was found

**A first assumption corrected before it could mislead the conclusion.**
`backend/prisma/seed-e2e.ts` deliberately mirrors the dev seed's own
fixture names (Sarah Mitchell, MG Road Clinic, `admin@medibook.dev`,
...) — so a spec matching those names is *not* evidence of which stack
it ran against, on its own. An early grep-based check (26 of 45 specs
reference those names) looked like proof of dev-targeting but wasn't;
corrected before it went into the findings register.

**The real, structural evidence:**
- `frontend/playwright.config.js`'s `use.baseURL` and `webServer.url`
  both default to `http://localhost:3000` (the shared dev frontend)
  whenever `E2E_BASE_URL` is unset.
- `npm run e2e` is `"playwright test"` — no env var set. This is the
  command name that appears throughout this codebase's own historical
  verification documents.
- Only 5 of ~190+ `test-results`/`context` documents ever mention `npm
  run e2e:isolated` or the isolated stack by name at all.
- 10 of 45 current specs (`clinician-portal.spec.js`,
  `rbac-negative.spec.js`, ...) reach into Postgres directly for setup,
  and correctly default to `medibook_postgres`/`medibook_db` (dev) when
  `E2E_DB_CONTAINER`/`E2E_DB_NAME` aren't set — real, working
  dual-target design, but its own default still targets dev.

**A real infrastructure gap found and fixed live, not just diagnosed.**
`medibook_backend_e2e` (already running, `docker ps` showed "Up 11
hours") was completely non-functional: its GraphQL endpoint gave an
empty reply, and its logs showed 357 TypeScript compile errors — a
stale Prisma Client (missing `tasks`/`payers`/`apiKeys`/
`scheduledReports`/... models added across many sessions since this
container was last refreshed) plus a `node_modules` volume missing
`pdfkit` entirely (added for `REQ057`, well before this container's
last dependency sync). Fixed live: `docker exec medibook_backend_e2e
npx prisma generate`, `npm install`, then a restart — confirmed via a
real GraphQL round trip afterward.

**Even freshly healthy, a live run reproduced the historical pattern.**
`npm run e2e:isolated -- auth-login.spec.js` on the just-repaired stack:
1 of 2 tests timed out waiting for the login form to render (a cold Vite
dev server's first-request compile, not an app bug) — a smaller-scale
repeat of `TR069`'s own three prior full-suite attempts, none of which
completed cleanly. A second run, server now warm, passed both tests
cleanly (14.3s, 19.2s).

## Conclusion

The isolated e2e stack is not a silently-broken idea — its design
(matching fixture names so specs are portable, env-var-driven
DB-container targeting for the specs that need it) is real and
reasonably sound. But it is **not what actually runs in practice**: the
default command (`npm run e2e`) and this codebase's own historical
verification language both point at the dev stack, and the isolated
stack's own operational fragility (staleness between uses, cold-start
timing) is a real, independent reason nobody's actual workflow
exercises it, beyond habit.

## Deliberately out of scope

- Changing `playwright.config.js`'s or `package.json`'s default `e2e`
  script to point at the isolated stack — a real behavioral change to
  every future e2e invocation, warranting its own reviewed slice with
  its own DoD, not a rider on an investigation.
- Running the full 66-spec suite against the isolated stack — the
  historical pattern (`TR069`, three attempts, none completed) plus this
  slice's own cold-start evidence suggest it's a genuinely long,
  environment-sensitive run; one representative spec (2 tests, run
  twice) was sufficient to confirm the pattern without the multi-hour
  cost of a full attempt.
- The `admin/Roles.jsx` mock-status stale-comment finding `TR069` itself
  already flagged (`admin-roles.spec.js`'s 1st of 2 tests) — resolved
  separately in this codebase's own history (§C staleness correction,
  2026-08-25), unrelated to this slice.
