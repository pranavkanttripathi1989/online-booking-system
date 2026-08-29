---
id: TR243
type: improvement
feature: scheduling-engine
created: 2026-08-30
updated: 2026-08-30
status: pass
parent: TP243
related: [REQ164, PLAN223]
commit: pending
---

# TR243 — Clinician calendar Drawer actions verification outcomes

## Unit tests

`frontend/src/pages/clinician/Calendar.test.jsx` (new, 4 tests, all pass):

```
PASS src/pages/clinician/Calendar.test.jsx
  clinician/Calendar — appointment Drawer actions (REQ164)
    ✓ shows and navigates via "Start Consultation" for a clinician on a non-terminal appointment
    ✓ shows and navigates via "Open Appointment Detail" regardless of role
    ✓ hides "Start Consultation" for a non-clinician role
    ✓ hides "Start Consultation" for a terminal (completed) appointment even for a clinician

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

## Static checks

- `npx eslint src/pages/clinician/Calendar.jsx` — 0 errors (22 pre-existing
  i18n/`Tooltip`-unused warnings, unchanged in kind from before this
  slice — this file predates the i18n framework, same as every other
  file in this codebase's pre-`REQ150` tree).
- `npm run lint` (full project) — 3315 warnings, 0 errors, under the 4908
  ratchet (unchanged from immediately before this slice — the 2 new
  hardcoded-string warnings on "Start Consultation"/"Open Appointment
  Detail" are within existing headroom).
- `npm run build` — clean, no new errors.
- `npm run size` — all 4 budgets green: initial bundle 330.07/350 kB,
  largest lazy chunk (charts) 109.92/115 kB, RichTextEditor chunk
  125.06/130 kB, initial CSS 13.59/18 kB gzipped. No new dependency.

## Live verification (Chrome DevTools MCP, real dev stack)

Logged in as the real seeded `clinician@medibook.dev` (Alex Clinician,
City Heart Clinic Group). Opened `/clinician/calendar`, clicked the real
"Priya Patient" appointment on the current week's Monday:

- Drawer rendered exactly matching the user's original screenshot shape
  plus the two new actions, in the planned order: Patient card → Time &
  Duration → Service → Room → **Start Consultation** → **Open
  Appointment Detail** → View Patient → Close.
- Clicked **Start Consultation** → navigated to
  `/clinician/encounters/03fcfefb-c93c-44db-b46a-b14eb80ebf3b` — the real
  `EncounterWorkspace` loaded correctly for this exact patient (Priya
  Patient's real timeline, chief complaints/history/vitals sections,
  etc.), confirming `getOrCreateEncounter` ran successfully against the
  real backend.
- Navigated back to the calendar, reopened the same appointment, clicked
  **Open Appointment Detail** → navigated to
  `/appointments/03fcfefb-c93c-44db-b46a-b14eb80ebf3b` — the real
  appointment detail page rendered with matching data (same patient,
  same time 9:30–9:50 PM, same service "GP Consultation", same clinician
  "Alex Clinician"), including its own pre-existing "Start Consultation"
  action in the Actions card — confirming both entry points converge on
  the same real appointment.

No terminal-status appointment existed in the currently-seeded week to
click live (the only real events this week were "Priya Patient" ×2,
both `confirmed`); the terminal-status hidden-button behavior is covered
by the unit test (`Calendar.test.jsx`'s 4th case) instead, which exercises
the same `isTerminalAppt` gate against a `completed` status directly.

## Result

**Pass.** AC1–AC5 all satisfied; no regressions found. No backend change
was made, so no backend suite was run for this slice (see `REQ164` AC5).
