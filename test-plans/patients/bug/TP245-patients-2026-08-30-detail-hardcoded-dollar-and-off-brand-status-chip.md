---
id: TP245
type: bug
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: approved
parent: PLAN225
related: [TR245]
---

# TP245 — `patients/detail.jsx` currency + status-chip fix verification

Test-suggestion stage skipped per Hard Rule 4 — a small, unambiguous
display bugfix on already-identified lines.

## Static checks

- `npx eslint` on the touched file — 0 new errors.
- Existing suite `detail.test.jsx` (8 tests) must pass after the
  `ThemeProvider` fix — these tests exercise the Insurance/Packages tabs,
  not the Appointments/Test Results chips directly, but any render-time
  crash in `statusChipSx` must not regress them.

## Live verification (manual, real dev stack)

As `clinician@medibook.dev`, open `/patients/:id` for any patient;
confirm the header balance chip reads `₹<amount> Balance` (Indian digit
grouping, no `$`); confirm the Appointments tab's status chips render as
soft alpha-tinted (not flat/solid) colors matching
`theme.palette.appointmentStatus`.
