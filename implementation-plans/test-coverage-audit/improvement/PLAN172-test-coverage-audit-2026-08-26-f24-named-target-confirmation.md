---
id: PLAN172
type: improvement
feature: test-coverage-audit
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ132
related: [TP192, TR192]
---

# PLAN172 — Implementation plan: F-24 named-target confirmation

## Change

**`frontend/src/components/BookingWizard/BookingWizard.test.jsx`** (new)
— covers `canProceed()`'s step-gating switch across all 5 steps by
rendering the real `BookingWizard` with each of its 5 sub-steps
(`BookingStep1Clinic`..`BookingStep5Confirm`) replaced via `jest.mock`
with a minimal stub exposing buttons that call the real `updateWizard`/
`onNext` props directly. This isolates the wizard's own step-advancement
gate from each sub-step's own heavy GraphQL/auth dependencies, which are
unrelated to what this file tests.

**`frontend/src/components/BookingWizard/BookingStep4Patient.jsx`**:
added `mode: 'onChange'` to the `useForm()` call, fixing the real bug
described in `REQ132`'s own account — `formState.errors` could never
populate through any real user interaction without it, since nothing in
the component calls `handleSubmit`.

**`frontend/src/components/BookingWizard/BookingStep4Patient.test.jsx`**
(new) — proves the fix: the existing-patient search shows by default; the
new-patient form's fields show no errors until interacted with; typing
then clearing First Name surfaces the real zod message; an invalid email
surfaces its own message and clears once corrected; typed values sync
into `wizardData.newPatient` on every change.

**`frontend/src/utils/dateUtils.js`**: deleted (confirmed zero importers
across the repo; missing its own `dayjs` import; `formatCurrency`
defaulted to GBP). **`frontend/src/utils/dateTime.js`**: updated the one
comment that referenced the now-deleted file, and corrected its own
JSDoc (`currency - ISO 4217 code, default 'GBP'` → `'INR'`, matching
what the function actually does and has since `NEW-DT-011`).

**`frontend/package.json`**: lint ratchet lowered `1911` → `1909`,
matching the two `no-unused-vars` warnings `dateUtils.js` itself carried
(`d`, `clinicTimezone`) that no longer exist once the file is gone.

## Testing

New: `BookingWizard.test.jsx` (6 tests), `BookingStep4Patient.test.jsx`
(5 tests) — 11 net-new tests, all passing.

No change needed to already-adequate coverage: `AuthContext.test.jsx`
(18 tests), `ProtectedRoute.test.jsx` (3), `RoleGuard.test.jsx` (7),
`pages/booking/index.test.jsx` (7, the *public* wizard's own step
validation), `dateTime.test.js` — each read in full and confirmed to
already exercise the real risk this finding named.

Full frontend suite: 24/24 suites (up from 22 — the 2 new files), all
green — 2 suites (`booking/index.test.jsx`, `EncounterWorkspace.test.jsx`)
timed out in a full-parallel run under host resource contention,
confirmed passing cleanly in isolation, matching this codebase's own
established precedent for this exact class of flakiness (neither imports
a file this slice touched). `eslint` clean on every touched file, 0 new
warnings; full `npm run lint` improved from 1911 to 1909 warnings
(deleting `dateUtils.js` removed its own 2), ratchet lowered to match.

## Documentation

`REQ132` (this requirement, includes the two real bugs found), `PLAN172`
(this plan), `TP192`/`TR192` (verification), a context bundle, and index
updates across all five doc roots plus the `test-coverage-audit` feature
README.
