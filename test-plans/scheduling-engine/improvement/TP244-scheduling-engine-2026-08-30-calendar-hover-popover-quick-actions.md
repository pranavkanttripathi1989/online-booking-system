---
id: TP244
type: improvement
feature: scheduling-engine
created: 2026-08-30
updated: 2026-08-30
status: approved
parent: PLAN224
related: [TR244]
---

# TP244 — Clinician calendar hover popover quick actions verification

Test-suggestion stage skipped per Hard Rule 4 — a routine, additive UI
change extending an already-verified pattern (`REQ164`) to a second entry
point.

## Frontend unit tests (`Calendar.test.jsx`, extended)

1. A clinician hovering a non-terminal appointment sees "Start
   Consultation" and "Open Detail" in the popover (not the Drawer's own
   "Open Appointment Detail", confirming the right surface is under
   test); clicking "Start Consultation" navigates to
   `/clinician/encounters/:id`.
2. A non-clinician role hides "Start Consultation" from the popover,
   "Open Detail" remains.
3. A terminal-status (`completed`) appointment hides "Start
   Consultation" from the popover, "Open Detail" remains.

## Static checks

- `npx eslint` on the touched file — 0 new errors.
- No backend change — no backend test plan for this slice.

## Live verification (manual, real dev stack)

As `clinician@medibook.dev`, hover a real non-terminal appointment on
`/clinician/calendar`; confirm the popover shows both quick actions
above "Click to view full details →"; click "Start Consultation" and
confirm it lands on the real `EncounterWorkspace` for that appointment.
