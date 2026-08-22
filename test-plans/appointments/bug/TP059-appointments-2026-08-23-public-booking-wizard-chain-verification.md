---
id: TP059
type: bug
feature: appointments
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: BUG011
related: [BUG010, PLAN032, TR058]
---

# TP059 — Verification for the public booking wizard chain fix

## Suggestion stage

Skipped per the `CLAUDE.md` conditional rule — bug fixes against an
already-established contract (the `?doctor=` query string both existing e2e
specs already assumed, and the backend's own numeric day-of-week
convention), not exploratory.

## The trap this plan has to avoid

Every defect in `BUG011` was invisible to the existing e2e suite precisely
*because* the suite's own assertions happened to match the mock fallback's
decorative output. A fix that makes those same specs pass again, unchanged,
proves nothing — the plan has to confirm the specs are now exercising real
data, not merely still green.

## Per-defect contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | Direct GraphQL query for `getClinicianAvailability` | `dayOfWeek` returned as an Int (e.g. `2`, `1`), never a string — confirms the fix target before touching code |
| TC-02 | `/appointments/book?doctor=<real id>` (anonymous) | Real clinician name (`Sarah Mitchell`, no "Dr." prefix — the mock's own decorative addition) and real clinic/products load, not the hardcoded mock object |
| TC-03 | Real `/doctor/:id` page, click "Book Appointment" | Navigates to `/appointments/book?doctor=<id>` and the wizard loads — not a 404 |
| TC-04 | `/doctor/:id` and the wizard, on a day the seeded clinician has real availability | Real time-slot buttons render, sourced from `getClinicianAvailability`, not the wizard's hardcoded 09:00–17:00 mock range |
| TC-05 | `booking-payment.spec.js`'s full flow, run on any day of the week | A slot is always selectable — availability must not be date-dependent given no test asserts absence on a specific day |
| TC-06 | Regression: all 8 e2e specs using the shared fixture clinician | Still green, both individually and as a group (allowing for known unrelated login-throttle flakiness under batched runs) |
| TC-07 | Frontend lint on both touched pages | 0 new errors/warnings vs. baseline |

## How TC-01 was checked

Direct `curl` POST to `http://localhost:4000/graphql` with a
`getClinicianAvailability` query against the real seeded clinician id,
inspecting the raw JSON response — establishes the bug is a real, provable
type mismatch before writing any fix, not a guess from reading code alone.

## How TC-02–05 were checked

`npx playwright test` against the real running stack (not a throwaway
script — these are the permanent specs `e2e/public-booking.spec.js` and
`e2e/booking-payment.spec.js`), with the accessibility-tree snapshot
(`error-context.md`) inspected on the one assertion that failed
post-fix (TC-04's exact button-label format) to confirm real data really was
rendering, just under a different, also-real label format than the test's
original (mock-derived) assumption expected.

## How TC-06 was checked

`npx playwright test e2e/manager-clinicians-patients.spec.js
e2e/calendar.spec.js e2e/manager-appointments.spec.js
e2e/manager-availability-blocks.spec.js e2e/public-booking.spec.js
e2e/booking-payment.spec.js e2e/clinician-portal.spec.js --workers=1`, run as
a full batch first, then any batch-only failures re-run individually after a
cooldown to distinguish real regressions from the login endpoint's own rate
limit (the same distinction `TP058`/`TC-07` already established for this
codebase).
