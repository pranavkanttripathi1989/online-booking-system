---
id: BUG054
type: bug
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: done
parent: —
related: [PLAN225, TP245, TR245]
---

# BUG054 — `patients/detail.jsx` used a literal "$" and a flat off-brand blue status chip

## What was wrong

Live-reported by the user (screenshot of `/patients/:id`):

1. The header's outstanding-balance chip read `$120 Balance` — a hand-formatted
   literal `$` prefix, no Indian digit grouping, violating FORM-18 (currency
   is always `₹` with `en-IN` grouping, formatted via a shared utility, never
   by hand in a component). The bug was doubly avoidable: this same file
   already had a correct `formatInr` helper 105 lines away, used correctly
   elsewhere on the same page — just not called here.
2. The Appointments and Test Results tabs' status chips ("Completed",
   "Confirmed", "Cancelled", "Pending") rendered via a per-file
   `STATUS_COLORS` map feeding MUI's solid `color` prop
   (`{confirmed:'success', completed:'info', cancelled:'error',
   pending:'warning'}`). `color="info"` renders a flat, saturated MUI blue —
   visually out of step with every other status chip in the app, which uses
   the shared soft alpha-tinted `theme.palette.appointmentStatus` tokens
   (UI-2/UI-8's own established convention, e.g. `Calendar.jsx`'s
   `statusCfgFor`, `RecentAppointmentsTable.jsx`).

## Root cause

Both were a "match the wrong existing convention" bug (Hard Rule 7):
`formatInr` was skipped rather than reused, and the status chip reused MUI's
generic `color` prop instead of this app's own shared status-token
convention — even though this file uses the identical status vocabulary
(confirmed/completed/cancelled/pending) that `theme.palette.appointmentStatus`
already covers.

## Fix

- Header balance chip now uses the shared `formatCurrency` utility
  (`frontend/src/utils/dateTime.js`, `Intl.NumberFormat('en-IN', {style:
  'currency', currency:'INR'})`) — `₹120.00 Balance`, matching every other
  currency display in the codebase.
- Both status chips now use a new local `statusChipSx(theme, status)`
  helper deriving `{bgcolor, color, border}` from
  `theme.palette.appointmentStatus[status]` (soft alpha tone), replacing
  the `STATUS_COLORS` map and MUI `color` prop entirely.
- Found and fixed in the same pass: `detail.test.jsx`'s `renderPage()` had
  no `<ThemeProvider>` at all — a bare render silently uses MUI's stock
  default theme, which has no `appointmentStatus` key, so
  `statusChipSx` threw immediately. Wrapped in the real
  `createAppTheme('light')`, matching the documented UI-8 convention
  (this exact class of gap already hit and fixed once before in
  `appointments/index.test.jsx`, per `FRONTEND_RULES.md`'s own §22 note).

See `PLAN225` for file-level detail and `TR245` for verification.
