---
id: TR246
type: bug
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: pass
parent: TP246
related: [BUG055, PLAN226]
commit: pending
---

# TR246 — `patients/detail.jsx` real-data wiring outcomes

## Unit tests

`npx jest src/pages/patients/detail.test.jsx --maxWorkers=2` — 13/13
pass (8 pre-existing Insurance/Packages tests + 5 new BUG055 tests, all
green).

## Static checks

`npx eslint src/pages/patients/detail.jsx src/pages/patients/detail.test.jsx`
— 0 errors (158 pre-existing i18n warnings, unchanged in kind).

## Live verification (Chrome DevTools MCP + the user's own live testing)

Against the real dev stack as `clinician@medibook.dev`, real patient
`7ea9442e-e2c6-42a4-85b0-268e59fcb51d` ("Priya Patient", City Heart
Clinic Group):

- Overview tab: real name, real DOB (20/06/1992, 34 years), real gender,
  real phone/email/address all render; "Blood Type" row and "Primary
  Clinician" card are genuinely absent (not blank).
- Header: "5 Visits" and "Last visit: 03 Sep 2026" both correctly
  derived from real appointment data; no balance chip; ID shortened to
  `#fcb51d` (was the full raw UUID).
- Appointments tab ("Appointments (5)"): all 5 real rows render — real
  clinician "Alex Clinician", real service "GP Consultation", correct
  dates (26/08–03/09/2026), correctly sorted newest-first, correct
  soft-tone status chips (4× Completed, 1× Confirmed) — none of the
  fabricated "Dr. Jane Smith"/"Dr. Carlos Vega" rows appear anywhere.
- Test Results tab: honest "Showing sample data — real per-patient test
  results aren't available yet." caption, no internal file-path leak
  (an earlier draft read "...see context/open-questions.md", fixed
  before this result was recorded).
- Header stat chips render with intentional theme-token colors (soft
  primary/info tints, correct icon color via an explicit `color: inherit
  !important` override — found live, since MUI's `.MuiChip-icon` does
  not automatically inherit a Chip's own custom `sx.color`).

## Result

**Pass.** The reported bug (fabricated identity/appointment history for
every real patient) is fixed; all follow-up polish items raised during
live testing (chip styling, icon color, ID truncation, caption wording)
are also fixed and confirmed. No regressions in the 8 pre-existing
Insurance/Packages tests.
