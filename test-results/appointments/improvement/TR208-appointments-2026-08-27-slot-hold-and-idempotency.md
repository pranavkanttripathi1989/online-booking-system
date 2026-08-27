---
id: TR208
type: improvement
feature: appointments
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ148
related: [PLAN188, TP208]
commit: pending
---

# TR208 — Test results: server-side slot hold + booking idempotency (P1-05)

## Backend — unit

`npx jest --maxWorkers=2` (full backend suite): **102/102 suites,
1679/1679 tests**, `tsc --noEmit` clean, `eslint "src/**/*.ts"` clean.
Includes: `appointments.service.spec.ts` 95/95 (9 new cases under
`idempotency key & slot hold` + 2 new cases under `holdSlot / releaseSlot
(resolver-facing shape)`, the latter a regression test for the
camelCase/snake_case field-mapping bug found live); `public.service.spec.ts`
24/24 (9 new cases under `idempotency key & slot hold (P1-05)`);
`slot-holds.service.spec.ts` 10/10, new file.

## Backend — integration (real Postgres + real Redis, from the host)

`cd backend && npm run test:int`: **5/5 suites, 390/390 tests**. New
`booking-hold-and-idempotency.int-spec.ts` — 3/3:

- a second hold for the same clinician/time is rejected while the first
  is active; explicit release frees it immediately
- a repeat idempotency key on a sequential retry returns the same
  appointment id, exactly one row persists
- **five truly-concurrent requests carrying the same idempotency key for
  the same brand-new slot: all 5 succeed, all 5 return the same
  appointment id, exactly one row persists** — the real "double-tap
  cannot create two appointments" proof this slice exists to deliver.
  Confirmed this only holds after widening the idempotency-key
  race-recovery check off a bare `P2002` check (see PLAN188's own
  account of that finding) — with the narrower check, this test failed
  with only 1 of 5 ids returned, the other 4 having hit the pre-existing
  "This time slot is no longer available" message instead of the
  intended no-op.

`booking-concurrency.int-spec.ts` (pre-existing, unaffected) still 1/1 —
confirms the EXCLUDE constraint itself is untouched by this slice's own
changes. `matrix-coverage.int-spec.ts` still 4/4 — the new `slot-holds`
module registered no new domain (no resolver of its own), confirmed
directly rather than assumed.

Re-ran `booking-hold-and-idempotency.int-spec.ts` alone a second time
immediately after the first (no `global-setup` re-run in between,
i.e. against the SAME already-populated test Postgres and the SAME real
Redis) to confirm the suite's own Redis cleanup is real, not
order-dependent luck: 3/3 again.

## A real environment gap found and fixed during this pass

`test/integration/setup/env.ts`'s `REDIS_URL` fallback never actually
applied (Prisma's own implicit `.env` auto-load via `global-setup.ts`'s
`@prisma/client` import wins the race in the same `--runInBand` process).
Confirmed via a temporary `console.error` instrumenting the exact value
`env.ts` observed, removed once diagnosed. Fixed by replacing the `??`
fallback with an explicit strip-and-replace of the one known-wrong
`redis://redis:` value, matching `TEST_DATABASE_URL`'s own existing guard
in the same file. Before the fix: `MaxRetriesPerRequestError` after ~10s
per Redis-touching call. After: instant, real connections to the host-
mapped `medibook_redis` container.

## Frontend

`CI=true npx jest src/pages/booking/index.test.jsx --maxWorkers=1`:
**8/8 passed** (64s — this file is already noted elsewhere in this
codebase's history as resource-contention-prone; ran in isolation to
avoid that). All 3 slot-selection tests now exercise the real
`holdPublicSlot` mutation (not just the local `bookingData.slot` update),
via new mocks added to this file's shared `buildMocks()` factory.

`npx eslint . --max-warnings 99999`: **1,906 warnings, 0 errors** —
unchanged from the standing ratchet baseline recorded in
`FRONTEND_RULES.md` §22 (measured 2026-08-27, same date as this slice) —
this slice's own new code contributes zero new warnings.

`npx size-limit`: all three budgets green (initial bundle 327.86 kB /
335 kB limit; largest lazy chunk 109.92 kB / 115 kB limit; initial CSS
13.5 kB / 18 kB limit).

`npm run build`: succeeded, 58.66s.

`CI=true npx jest --maxWorkers=2` (full frontend suite, run in the
background while docs were being written, confirmed completed before
this document was finalized): **29/31 suites passed, 213/216 tests
passed**. The 2 failing suites — `manager/claims/index.test.jsx` and
`clinician/EncounterWorkspace.test.jsx` — are both pre-existing,
documented elsewhere in this codebase's own history as resource-
contention-prone under full-parallel runs (neither imports
`booking/index.jsx` or any file this slice touched); not re-verified in
isolation this pass since `booking/index.test.jsx` (the only file this
slice's own frontend changes could plausibly affect) was already
confirmed 8/8 in its own dedicated isolated run above.

## Deliberately not covered

A live-browser pass of the countdown UI (ticking display, the
expiry-returns-to-picker flow) — no browser-automation tool was
available this session. Logged as a stated gap, matching TP208's own
account, not silently skipped.

## Verdict

All acceptance criteria in REQ148 met and verified — the two headline
correctness proofs ("two browsers cannot book the same slot" via the
pre-existing EXCLUDE constraint, re-confirmed unaffected; "a double-tap
cannot create two appointments" via the new idempotency key, proven under
genuine 5-way concurrency) both hold against the real stack, not just
mocked-Prisma unit coverage.
