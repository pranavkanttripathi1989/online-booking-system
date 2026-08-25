---
id: TR115
type: improvement
feature: insurance-claims
created: 2026-08-25
updated: 2026-08-25
status: pass
parent: TP116
related: [REQ062, PLAN089]
---

# TR115 — Results for patient insurance policy capture UI (REQ062)

Executed 2026-08-25 against `medibook_backend`/`medibook_postgres` (the
shared dev stack) on `master`. No backend change in this slice.

## Frontend unit — `patients/detail.test.jsx` (new)

| Case | Result |
|---|---|
| Real empty state when no policies exist | **pass** |
| Real policies render | **pass** |
| Recording a new policy calls the real mutation with the correct variables | **pass** |

3/3, all passing on the first run. Full frontend unit suite re-run at
the end of the whole A-4–A-8 batch: 18 suites / 116 tests, all passing
(`--runInBand`). `eslint`: 0 errors, 162 warnings (ratchet held — this
slice's own edit to `patients/detail.jsx` actually reduced this file's
own warning count by one, since the new code uses the previously-unused
`LinearProgress` import). `npm run build`: clean.
`scripts/check-page-data-wiring.mjs`: 0 new fabricated pages.

## e2e — `gap-analysis-a4-a8.spec.js` (new, shared A-4–A-8 fixture file)

| Case | Result |
|---|---|
| Staff records a real policy against a real patient and a real (directly-inserted) Payer fixture | **pass** |

1/1. `Payers` has no seeded row and `createPayer` is `super_admin`-only
with no seeded super_admin demo account — the fixture Payer was inserted
directly via SQL (`gen_random_uuid()`), matching this suite's own
established pattern for fixture data the real API/UI genuinely can't
create. Found and fixed a real fixture-hygiene bug while stabilizing this
test: the spec's own `psql()` cleanup helper was missing a `return`
statement, so a "find-or-create" idempotency check always fell through to
"create" — silently accumulating duplicate `Payers` rows across repeated
runs and breaking the test's own payer-picker locator once two
same-named rows existed. Fixed, and every `afterAll` cleanup statement
now runs through a `safePsql` wrapper so one failing statement can no
longer abort the rest of cleanup (the root cause of the residue in the
first place). Confirmed clean via a direct DB check after a full run:
zero leftover `Payers`/`Appointments`/`WebhookEndpoints` rows and the
clinician demo account's `clinician_id` correctly reverted to `NULL`.

## Commits

See the commits immediately following this test-results doc in `git log`.
