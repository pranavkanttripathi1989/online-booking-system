---
id: TP248
type: bug
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: approved
parent: PLAN228
related: [TR248]
---

# TP248 — Appointments tab click-through verification

Test-suggestion stage skipped per Hard Rule 4 — a small, well-precedented
UI addition matching an existing accessible pattern.

## Frontend unit test

`detail.test.jsx`: clicking a real appointment row on the Appointments
tab navigates to `/appointments/:id` for that exact appointment.

## Live verification (manual + Chrome DevTools MCP)

As `clinician@medibook.dev`, open Priya Patient's Appointments tab and
click the real "03/09/2026" row; confirm it navigates to
`/appointments/0c4a6cc6-6df5-4c8b-9ec7-7255c89a4225` and renders
correctly.
