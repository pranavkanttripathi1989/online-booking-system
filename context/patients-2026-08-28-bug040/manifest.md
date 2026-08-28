---
id: CTX-patients-2026-08-28-bug040
type: bug
feature: patients
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG040, BUG041, PLAN202, TP222, TR222]
---

# BUG040/BUG041 — e2e seed patient linkage and a live-found mock-fallback defect (2026-08-28)

## What happened

The user asked for realistic-looking seed data on the isolated
`medibook_frontend_e2e`/`medibook_backend_e2e` stack ("should look like
real data in seeders" — replacing `seed-e2e.ts`'s old "E2E PatientNNNN"
placeholder naming with real-looking Indian names), then to rerun the
e2e stack and do a real QA pass against it.

Along the way: the `medibook_backend_e2e` container was found
genuinely wedged (0% CPU, no progress, for ~2 hours) after an earlier
`npm ci` fixed a separate missing-dependency crash
(`@opentelemetry/sdk-node`) — resolved via the established "quit and
relaunch Docker Desktop entirely" recovery pattern already documented
in `CLAUDE.md`, not a new finding. The main dev backend
(`medibook_backend`) separately needed `prisma generate` +
`docker restart` after its own Prisma Client drifted stale relative to
`schema.prisma` (`departments`, `prepayment_policy`, `paymentTenders`
all missing from the generated client) — also the already-documented
gotcha, not new.

Once both stacks were healthy, live QA against the freshly reseeded
e2e stack (`manager@medibook.dev`) surfaced two real, distinct bugs:

## BUG040 (done) — seed patients never set `client_org_id`

`Patients.client_org_id` was added by `BUG024` (2026-08-26) as a hard
tenant-isolation requirement. `seed-e2e.ts`'s bulk 199-patient
`createMany` and its "Anita Sharma" fixture both predate that change
and never set it — every seeded patient landed `client_org_id: null`,
invisible to any org-scoped account. `/patients` as
`manager@medibook.dev` returned a real, error-free, empty result
against 200 real rows. Fixed by adding `client_org_id: primaryOrg.id`
to both call sites. Live-reverified: 200 patients, 1,060 upcoming
appointments, and a fully populated manager dashboard (₹79,500 revenue,
121 active patients) all render correctly post-fix.

## BUG041 (open, logged only) — `patients/index.jsx` mock fallback on empty result

Diagnosing BUG040 surfaced a second, independent, pre-existing frontend
defect: `patients/index.jsx`'s `useMock = apiPatients.length === 0 &&
!loading` never checks the query's own `error` — so a genuine, correct,
empty result (exactly what BUG040's un-fixed state produced) silently
rendered a hardcoded `MOCK_PATIENTS` list ("Alice Johnson", "Bob Smith",
"Carlos Reyes", "Diana Prince") instead of an honest empty state. This
is the DATA-13 bug class `FRONTEND_RULES.md` names directly and that
CLAUDE.md's own Priority 3 sweep already fixed on
`appointments/index.jsx`/`calendar/index.jsx` — `patients/index.jsx`
was evidently missed or regressed since. Logged only, per this
session's standing "log findings, review before fixing" protocol for
product-code bugs (as distinct from the seed-fixture fix itself, which
was in-scope infrastructure work the user directly asked for).

## Verification

`npx tsc --noEmit` clean. Fresh reseed + live Chrome DevTools MCP pass
against the real e2e stack (not just direct SQL) — see `TR222`.

## Documents

- `requirements/patients/bug/BUG040-*.md` (done), `BUG041-*.md` (open)
- `implementation-plans/patients/bug/PLAN202-*.md`
- `test-plans/patients/bug/TP222-*.md`
- `test-results/patients/bug/TR222-*.md`
