---
id: TR244
type: improvement
feature: scheduling-engine
created: 2026-08-30
updated: 2026-08-30
status: pass
parent: TP244
related: [REQ165, PLAN224]
commit: pending
---

# TR244 — Clinician calendar hover popover quick actions outcomes

## Unit tests

`Calendar.test.jsx` — 7/7 pass (4 pre-existing Drawer tests + 3 new
popover tests):

```
PASS src/pages/clinician/Calendar.test.jsx
  clinician/Calendar — appointment Drawer actions (REQ164)
    ✓ shows and navigates via "Start Consultation" ...
    ✓ shows and navigates via "Open Appointment Detail" ...
    ✓ hides "Start Consultation" for a non-clinician role
    ✓ hides "Start Consultation" for a terminal (completed) appointment ...
  clinician/Calendar — hover popover quick actions
    ✓ shows and navigates via both quick actions from the hover popover, without opening the Drawer
    ✓ hides the popover's "Start Consultation" for a non-clinician role, keeping "Open Detail"
    ✓ hides the popover's "Start Consultation" for a terminal (completed) appointment

Tests: 7 passed, 7 total
```

## Static checks

`npx eslint src/pages/clinician/Calendar.jsx` — 0 errors (24 pre-existing
i18n/unused-import warnings, up from 22 due to the 2 new button labels —
within the project's existing lint ratchet headroom).

## Live verification (Chrome DevTools MCP, real dev stack)

Logged in as `clinician@medibook.dev` (Alex Clinician). Hovered the real
"Priya Patient" appointment on `/clinician/calendar` — the popover
rendered "Start Consultation" and "Open Detail" above "Click to view
full details →", exactly as designed. Clicked "Start Consultation" →
navigated to `/clinician/encounters/03fcfefb-c93c-44db-b46a-b14eb80ebf3b`
— the same real appointment id verified in `TR243`, confirming both the
Drawer's and the popover's "Start Consultation" converge on the same
target.

## Result

**Pass.** AC1–AC4 all satisfied. No regressions in the 4 pre-existing
`REQ164` Drawer tests.
