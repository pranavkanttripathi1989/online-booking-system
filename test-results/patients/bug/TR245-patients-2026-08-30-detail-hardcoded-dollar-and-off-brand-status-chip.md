---
id: TR245
type: bug
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: pass
parent: TP245
related: [BUG054, PLAN225]
commit: pending
---

# TR245 — `patients/detail.jsx` currency + status-chip fix outcomes

## Static checks

`npx eslint src/pages/patients/detail.jsx` — 0 errors.

## Unit tests

`npx jest src/pages/patients/detail.test.jsx --maxWorkers=2` — 8/8 pass
(previously 0/8, all crashing with `Cannot read properties of undefined
(reading 'confirmed')` from `statusChipSx` reading
`theme.palette.appointmentStatus` against a bare-default MUI theme with
no `<ThemeProvider>` in the test's render tree — fixed by wrapping in the
real `createAppTheme('light')`).

## Live verification (Chrome DevTools MCP, real dev stack)

As `clinician@medibook.dev`, opened `/patients/:id` (the mock-data
"John Michael Doe" record) — confirmed via direct screenshot from the
user:

- Header balance chip now reads `₹120 Balance` (was `$120 Balance`).
- Appointments tab status chips ("Confirmed", "Completed" ×2,
  "Cancelled") now render as soft alpha-tinted pills matching
  `theme.palette.appointmentStatus`, not flat/solid MUI colors.

## Result

**Pass.** Both reported display bugs fixed; no regressions in the
existing 8-test suite.
