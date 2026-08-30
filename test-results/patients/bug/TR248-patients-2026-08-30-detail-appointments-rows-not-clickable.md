---
id: TR248
type: bug
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: pass
parent: TP248
related: [BUG057, PLAN228]
commit: pending
---

# TR248 — Appointments tab click-through outcomes

## Unit tests

`npx jest src/pages/patients/detail.test.jsx --maxWorkers=2` — 14/14
pass (13 pre-existing + 1 new).

## Static checks

`npx eslint src/pages/patients/detail.jsx` — 0 errors.

## Live verification (Chrome DevTools MCP, real dev stack)

As `clinician@medibook.dev`, on Priya Patient's real Appointments tab
(5 real rows): each row now exposes as an accessible
`role="button"`/`aria-label="View appointment on <date>"` element.
Clicked the real "03/09/2026" row → navigated to
`/appointments/0c4a6cc6-6df5-4c8b-9ec7-7255c89a4225` — the exact
appointment the user asked about — which rendered correctly (Priya
Patient, GP Consultation, Completed, Alex Clinician).

## Result

**Pass.**
