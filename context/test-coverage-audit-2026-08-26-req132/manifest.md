---
id: CTX-test-coverage-audit-2026-08-26-req132
type: improvement
feature: test-coverage-audit
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ132
related: [PLAN172, TP192, TR192]
---

# test-coverage-audit — REQ132: F-24 named-target confirmation (2026-08-26)

Ninth slice of the next 10-slice batch (`project-plans/analysis/12-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ132 | [F-24 named-target confirmation](../../requirements/test-coverage-audit/improvement/REQ132-test-coverage-audit-2026-08-26-f24-named-target-confirmation.md) |
| implementation-plans | PLAN172 | [implementation plan](../../implementation-plans/test-coverage-audit/improvement/PLAN172-test-coverage-audit-2026-08-26-f24-named-target-confirmation.md) |
| test-plans | TP192 | [verification plan](../../test-plans/test-coverage-audit/improvement/TP192-test-coverage-audit-2026-08-26-f24-named-target-confirmation.md) |
| test-results | TR192 | [verification results — pass](../../test-results/test-coverage-audit/improvement/TR192-test-coverage-audit-2026-08-26-f24-named-target-confirmation.md) |

## What shipped

F-24's own status line asked for a file-by-file confirmation of five
named highest-risk targets, "not re-investigated... so still logged
open rather than closed on an assumption." Investigated each. Three
(`AuthContext`, `ProtectedRoute`/`RoleGuard`, public booking-wizard step
validation, currency/date utils in `dateTime.js`) were already
thoroughly covered — no gap. Two real, concrete findings closed:

1. **`components/BookingWizard/*`** — the *internal* staff/patient
   booking wizard (`appointments/create.jsx`), a completely separate
   component tree from the already-covered public wizard, had zero
   tests. New `BookingWizard.test.jsx` covers its `canProceed()`
   step-gating across all 5 steps.
2. **A real bug in `BookingStep4Patient.jsx`**: its new-patient zod
   validation could never surface an error to the user — `useForm()`
   had no explicit mode and nothing calls `handleSubmit`, so RHF's
   default `'onSubmit'` mode left `formState.errors` permanently empty.
   Fixed with `mode: 'onChange'`; new `BookingStep4Patient.test.jsx`
   proves it.

Also found and removed `utils/dateUtils.js` — a confirmed dead file
(zero importers), missing its own `dayjs` import (would `ReferenceError`
if ever called), and defaulting `formatCurrency` to GBP — the exact bug
`dateTime.js`'s own live formatter already documents having fixed.

## Verification

Frontend: 24/24 suites green (2 confirmed pre-existing-flaky under full
parallel load, pass in isolation). `eslint` clean; full lint ratchet
improved 1911→1909, ceiling lowered to match.
