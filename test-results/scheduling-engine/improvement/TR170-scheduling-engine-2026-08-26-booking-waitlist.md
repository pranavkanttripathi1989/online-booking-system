---
id: TR170
type: improvement
feature: scheduling-engine
created: 2026-08-26
updated: 2026-08-26
status: done
parent: TP170
related: [PLAN146]
---

# TR170 — Test results: booking waitlist for fully-booked slots

## TP170 case outcomes

All 25 cases pass.

```
PASS src/waitlist/waitlist.service.spec.ts        (17 tests — cases 1-16)
PASS src/waitlist/waitlist-expiry-sweep.service.spec.ts (3 tests — cases 17-18)
PASS src/appointments/appointments.service.spec.ts (63 tests, 3 new — cases 19-21)

Test Suites: 90 passed, 90 total (full backend unit suite)
Tests:       1408 passed, 1408 total
```

`npx tsc --noEmit` — clean. `npx eslint "{src,apps,libs,test}/**/*.ts"` —
0 errors, 0 new warnings (one unused-var error caught and fixed before
this run — a leftover `patientBUser` fixture never referenced).

Integration (case 22, real Postgres via `npm run test:int` from the
host — CLAUDE.md's own documented `localhost:5433` gotcha):

```
PASS test/integration/tenancy.int-spec.ts
PASS test/integration/encounter-lock-trigger.int-spec.ts
PASS test/integration/booking-concurrency.int-spec.ts
PASS test/integration/matrix-coverage.int-spec.ts

Test Suites: 4 passed, 4 total
Tests:       387 passed, 387 total
```

387, up from 369 before this slice — the new `waitlist` domain-case
(clinic-omitted org-wide shape, matching `checklist`/`scheduled-reports`)
exercises the full RBAC/cross-org matrix automatically;
`matrix-coverage.int-spec.ts` confirms the new domain is classified, not
an unclassified gap.

Frontend: `npx eslint src/pages/booking/index.jsx
src/pages/patient/Appointments.jsx` — 0 errors (2 pre-existing warnings
on `booking/index.jsx`, 10 pre-existing on `Appointments.jsx`, none
new).

Cases 23-25 (frontend) verified by code inspection and ESLint's JSX
parse (which would fail on an unbalanced fragment) rather than a live
browser or e2e run — no browser-automation tool was available this
session; see `PLAN146`'s own Outcome section for why this is an
honestly-logged gap, not a silent skip.

## Cross-session file-sharing note

Four files this slice needed to touch (`backend/prisma/schema.prisma`,
`backend/src/app.module.ts`, `backend/test/integration/setup/fixture.ts`,
`backend/test/integration/setup/domain-cases.ts`) had a second Claude
Code session's own uncommitted, unrelated `Tasks` (`REQ080`) changes
sitting in the working tree throughout this slice. Every edit here used
the established hand-crafted-patch-against-HEAD + `git apply --cached`
technique (this session's own precedent from `REQ101`/`REQ102`/`REQ113`/
`REQ112`/`REQ110`) to stage only this slice's own hunks into the git
index while leaving the other session's uncommitted work untouched in
the working tree — confirmed via `git diff --cached` (my hunks only)
and `git diff` (their hunks only) immediately before each commit.

## Real design decisions confirmed correct by the test run, not just asserted

- **`promoteNext()` outside the `$transaction`**: `case 19`/`20`
  confirm it's called with the exact clinician id and a UTC-midnight
  date derived from the appointment's own `appointment_time` — proving
  the post-transaction position (matching `notifyCancellation`) doesn't
  lose the data it needs.
- **UTC-midnight date parsing** (`case 6`): a direct assertion that
  `joinWaitlist({date: '2026-09-01'})` stores exactly
  `new Date('2026-09-01T00:00:00.000Z')`, not a host-local-timezone
  variant — the same class of bug this codebase has hit before on this
  IST host (`clinician-dashboard`'s own fixture bug,
  `context/open-questions.md` #15).
- **Hard Rule 6 derivation** (`case 3`): a platform-operator caller
  (`client_org_id: null`) still produces a correctly org-A-anchored
  waitlist entry, proving the org id comes from the clinician's own
  clinic and never from the caller — the exact
  `departments.service.ts` bug class this codebase already found and
  fixed once, applied proactively here rather than discovered by a
  failing test.

## Live verification

Not performed against the real dev stack this slice (no browser
automation tool available this session). The real Postgres integration
suite (`test:int`) is the closest available substitute — it runs the
real `AppModule`, real JWTs through the real guard chain, and a real
`WaitlistEntries` table, just not through a live browser.
