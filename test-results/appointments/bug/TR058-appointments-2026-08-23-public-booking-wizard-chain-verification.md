---
id: TR058
type: bug
feature: appointments
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP059
related: [BUG010, BUG011, PLAN032]
---

# TR058 — Results for the public booking wizard chain fix

Executed 2026-08-23 against the restored dev `medibook_db` (Node, Playwright
1.62.1, Chromium headless), on `master`.

## Per-defect contract

| Case | Result | Evidence |
|---|---|---|
| TC-01 `getClinicianAvailability` returns numeric `dayOfWeek` | **pass** | Direct `curl` GraphQL query returned `{"dayOfWeek":2,...},{"dayOfWeek":1,...}` — raw JSON numbers, confirming the string-comparison bug before any fix was written |
| TC-02 real data loads on `?doctor=` | **pass** | Post-fix (`f8715d0`) accessibility snapshot shows `heading "Sarah Mitchell"`, `"General Physician"`, `"12 MG Road"` — no "Dr." prefix, no mock clinic name |
| TC-03 "Book Appointment" click reaches the wizard | **pass** | `e2e/booking-payment.spec.js` (which relies on this exact navigation happening correctly upstream in real use, though it enters via direct URL) green; manual reasoning over the fixed `navigate()` target confirmed against the real route table in `App.jsx` |
| TC-04 real slot buttons render | **pass** | Pre-fix: page snapshot showed only the calendar, no slot buttons and no "No slots" message reachable within timeout. Post-fix: snapshot shows real `button "09:00"`, `"09:30"`, `"10:00"`, ... — sourced from real `getClinicianAvailability`, confirmed by the button count changing when the extended-availability dump was applied |
| TC-05 slot always selectable regardless of day | **pass** | Availability extended to all 7 days (`92f45e6`); `booking-payment.spec.js` green on the day it was actually run (Sunday) — a day with no availability under the original Mon/Tue-only fixture |
| TC-06 full regression across 8 dependent specs | **pass** | `manager-clinicians-patients` 5/5, `calendar` 2/2, `manager-appointments` 3/3, `manager-availability-blocks` 2/2, `public-booking` 2/2, `booking-payment` 1/1, `clinician-portal` 2/2 — 2 batch-run failures (`manager-appointments`'s first case, `clinician-portal`'s calendar case) reproduced as passing in isolation after a cooldown, confirming login-throttle flakiness rather than a regression (same pattern `TR057` already established for this codebase) |
| TC-07 lint | **pass** | `npx eslint` on both touched pages: 0 errors, 0 new warnings (4 pre-existing warnings unrelated to this change) |

## What TC-06's throttled failures actually showed

`clinician-portal.spec.js`'s `afterAll` failing on the same
`ThrottlerException` that caused its test-body failure meant its own
disposable Thursday-slot/Friday-lunch-break test rows were never cleaned up
— confirmed live (4 duplicate rows each, timestamped across four separate
prior sessions going back to 2026-08-22, all still present in the restored
dump). Soft-deleted before re-running; the spec's own cleanup succeeded
normally afterward. This is pre-existing debris this bug's fix exposed by
finally running the spec against a real, correctly-populated fixture — not
something the code changes here introduced.

## Static checks

`npx eslint` on both touched pages: clean (see TC-07). Frontend `npm test`:
4/4 passed, unaffected (no unit coverage exists for either page).

## Commits

`f8715d0` (booking wizard + doctor profile fix), `8e2a9d5` (e2e assertion
fix), `92f45e6` (DB fixture restore + availability extension + orphaned-row
cleanup).
