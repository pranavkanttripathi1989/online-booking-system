---
id: TP246
type: bug
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: approved
parent: PLAN226
related: [TR246]
---

# TP246 — `patients/detail.jsx` real-data wiring verification

Test-suggestion stage skipped per Hard Rule 4 — a well-precedented fix
against an already-proven, already-used-elsewhere backend contract.

## Frontend unit tests (`detail.test.jsx`, extended)

1. Real patient identity renders; the fabricated "John Michael Doe"
   default never appears.
2. Real appointments render on the Appointments tab (real clinician,
   real service); the fabricated "Dr. Jane Smith"/"Dr. Carlos Vega" rows
   never appear.
3. `total_visits`/`last_visit` are correctly derived from the real fetched
   appointment data; the six fields with no real backing (Balance chip,
   Blood Type, Primary Clinician) are genuinely absent from the DOM, not
   merely blank.
4. A `patient: null` response renders a real "Patient not found." state.
5. A genuine GraphQL error renders a real error state with a working
   Retry button.

All 8 pre-existing Insurance/Packages tests in this file must keep
passing unmodified (they now implicitly depend on the new
`patientDetailMock()` default being auto-prepended by `renderPage()`).

## Static checks

`npx eslint` on both touched files — 0 new errors.

## Live verification (manual + Chrome DevTools MCP, real dev stack)

As `clinician@medibook.dev`, open the real patient
`/patients/7ea9442e-e2c6-42a4-85b0-268e59fcb51d` ("Priya Patient");
confirm real identity, real appointment count/history, correct derived
Visits/Last-visit stats, absence of the six unbacked fields, and the
Test Results tab's honest disclosure caption (no internal file-path
leak). Confirm the header stat chips render with intentional theme-token
colors, including correct icon color.
