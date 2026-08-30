---
id: CTX-patients-2026-08-30-bug054
type: bug
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: done
parent: —
related: [BUG054, PLAN225, TP245, TR245]
---

# `patients/detail.jsx`: literal "$" balance + off-brand blue status chips (2026-08-30)

User-reported live: the patient detail page's balance chip read `$120
Balance` (a hand-formatted `$`, no `₹`, no digit grouping) and its
Appointments/Test Results status chips ("Completed" etc.) rendered as a
flat, saturated MUI `info` blue instead of the app's shared soft
alpha-tinted status tokens.

Fixed: balance chip now uses the shared `formatCurrency` utility
(`utils/dateTime.js`); both status chips now derive from
`theme.palette.appointmentStatus[status]` via a new local `statusChipSx`
helper, replacing a per-file `STATUS_COLORS` map. Also found and fixed a
real, previously-undetected test gap: `detail.test.jsx`'s `renderPage()`
had no `<ThemeProvider>` at all, so the new `statusChipSx` crashed every
one of its 8 tests until wrapped in the real `createAppTheme('light')`
(the same UI-8 gap class already documented and fixed once before in
`appointments/index.test.jsx`).

## Verification

`eslint` 0 errors; `detail.test.jsx` 8/8 pass (0/8 before the
`ThemeProvider` fix). Live-confirmed by the user via screenshot: header
now shows `₹120 Balance`, status chips render as soft-toned pills.

## Documents

- `requirements/patients/bug/BUG054-*.md`
- `implementation-plans/patients/bug/PLAN225-*.md`
- `test-plans/patients/bug/TP245-*.md`
- `test-results/patients/bug/TR245-*.md`

## Not done this pass, stated not hidden

This same page was found, in the same live-testing session, to render a
FIXED mock patient identity ("John Michael Doe") for every real patient
id (`MOCK_PATIENTS_DETAIL[id] ?? MOCK_PATIENT_DEFAULT` never matches a
real UUID) — a much larger, separate defect. That is scoped and fixed
under its own bundle, not folded into this one (see the follow-up
`patients-2026-08-30-bug055` bundle / `BUG055`).
