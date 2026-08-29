---
id: PLAN224
type: improvement
feature: scheduling-engine
created: 2026-08-30
updated: 2026-08-30
status: done
parent: REQ165
related: [REQ165, TP244, TR244]
---

# PLAN224 — Clinician calendar hover popover quick actions

## Design

`ApptPopover` (`frontend/src/pages/clinician/Calendar.jsx`) is a standalone
function component rendered as JSX, so it can call hooks directly —
added `useNavigate()` and `useAuth()`'s `hasRole` inside it (previously it
received no navigation/auth props at all). A new `isTerminalEv` const
mirrors the Drawer's own `isTerminalAppt`/`appointments/detail.jsx`'s
`isTerminal` exactly (`['cancelled','completed','no_show'].includes(ev.status)`).

Two small `Button`s (`size="small"`, `fullWidth`, in a `Stack
direction="row"`) were added to the popover's footer box, above the
existing "Click to view full details →" link:

- **"Start Consultation"** — `variant="contained"`, shown when
  `hasRole('clinician') && !isTerminalEv`, navigates to
  `/clinician/encounters/${ev.id}`. Reuses `MonitorHeartRoundedIcon`
  (already imported for the Drawer's own button in `REQ164`).
- **"Open Detail"** — `variant="outlined"`, always shown, navigates to
  `/appointments/${ev.id}`. Reuses `OpenInNewIcon` (also already
  imported). Shortened label vs. the Drawer's "Open Appointment Detail"
  to fit the popover's 320px width without wrapping.

No backend change, no new route — identical navigation targets to
`REQ164`'s own Drawer buttons, just a second entry point.

## Files changed

```
frontend/src/pages/clinician/Calendar.jsx       — ApptPopover gains useNavigate/hasRole,
                                                    isTerminalEv const, 2 new footer buttons
frontend/src/pages/clinician/Calendar.test.jsx  — new describe block, 3 tests
```

## Verification

- Unit: 3 new tests (7 total in the file, up from 4) — both quick actions
  render and "Start Consultation" navigates correctly on hover; the
  Drawer's own differently-labelled button is confirmed absent (proving
  the popover, not the Drawer, is what's under test); "Start
  Consultation" is hidden for a non-clinician role and for a terminal
  (`completed`) appointment, "Open Detail" stays visible in both cases.
- `npx eslint` on the touched file: 0 errors (i18n warnings only,
  consistent with the rest of the file).
- Live check (Chrome DevTools MCP, real dev stack, `clinician@medibook.dev`):
  hovering the real "Priya Patient" appointment on `/clinician/calendar`
  now shows both quick actions in the popover; clicking "Start
  Consultation" navigated to the real `/clinician/encounters/:id` for
  that exact appointment.

See `TR244` for the full recorded outcome.
