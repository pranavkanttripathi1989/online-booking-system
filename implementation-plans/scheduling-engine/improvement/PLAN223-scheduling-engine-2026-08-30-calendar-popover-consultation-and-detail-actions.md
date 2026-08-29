---
id: PLAN223
type: improvement
feature: scheduling-engine
created: 2026-08-30
updated: 2026-08-30
status: done
parent: REQ164
related: [REQ164, TP243, TR243]
---

# PLAN223 — Clinician calendar Drawer: "Start Consultation" + "Open Appointment Detail"

## Research (before scoping)

Two research passes over the real code and this repo's own docs, per
`REQ164`'s own account:

- `frontend/src/pages/clinician/Calendar.jsx`'s `ApptPopover` (hover card,
  ~line 350) has one action, "Click to view full details →", which opens
  a `Drawer` (the `selected` panel, ~lines 908-1123) — this Drawer is
  what the user's screenshot shows. Its footer (~1092-1120) had "Join
  Video Call" (video only), "View Patient" (→ `/patients/:id`), "Close".
- `frontend/src/pages/appointments/detail.jsx` already renders a "Start
  Consultation" button gated on `hasRole('clinician') && !isTerminal`
  (`isTerminal = ['cancelled','completed','no_show'].includes(status)`),
  navigating to `/clinician/encounters/${apt.id}` with no mutation call —
  `EncounterWorkspace.jsx` (route `/clinician/encounters/:appointmentId`)
  auto-`getOrCreateEncounter`s on mount.
- `/appointments/:id` already exists as a route; every calendar event
  object already carries its own appointment `id`/`status`.
- Competitive grounding: `REQ042`'s `startConsultation` mutation +
  waiting-room journey model (citing Semble's `Journey`/`dna`, `REQ003`)
  is the closest in-repo precedent for "consultation launch," but it's a
  queue/attendance-tracking concept wired only into the front-desk
  waiting-room page — deliberately kept separate from this slice's pure
  navigation-based launch, matching `detail.jsx`'s own precedent.
- No `checked_in` token exists in `theme.palette.appointmentStatus`
  (`theme/index.js`) — `statusCfgFor` falls back to `.confirmed`. Noted,
  not fixed here (out of scope for the two requested actions).

## Design decision

**Reuse, don't reinvent.** Add both actions to the Drawer footer, using
the *exact* gating condition and navigation target `appointments/detail.jsx`
already ships and already tests:

- **"Start Consultation"** — `hasRole('clinician') && !isTerminalAppt`
  (a new local `isTerminalAppt` const computed alongside the file's
  existing `isPatientAppt`/`statusCfg`/`initials` consts, same pattern).
  `navigate(`/clinician/encounters/${selected.id}`)`.
- **"Open Appointment Detail"** — always visible (any authenticated
  calendar viewer can already reach `/appointments/:id` elsewhere).
  `navigate(`/appointments/${selected.id}`)`.

No backend changes, no new mutation, no new route, no new GraphQL field.
`Calendar.jsx` did not previously destructure `hasRole` from `useAuth()`
(only `user`) — added alongside the existing `user` destructure.

**Button order/hierarchy** (more user-friendly, not just more buttons):
"Start Consultation" as `variant="contained"` (matches `detail.jsx`'s own
primary treatment) placed after "Join Video Call" (video keeps its
existing conditional slot), then "Open Appointment Detail" and "View
Patient" as `variant="outlined"`, then "Close" last. Icons:
`MonitorHeartRoundedIcon` (matches `detail.jsx`'s own icon for this exact
button) and `OpenInNewIcon` (new import, both from `@mui/icons-material`,
matching this file's existing per-icon import convention — PERF-11).
Theme tokens only, no hardcoded colors (UI-2) — both new buttons reuse
the same `sx` shape already used by "View Patient".

## Files changed

```
frontend/src/pages/clinician/Calendar.jsx       — 2 new icon imports, hasRole destructure,
                                                    isTerminalAppt const, 2 new Drawer-footer buttons
frontend/src/pages/clinician/Calendar.test.jsx  — new file, 4 tests
```

## Verification

- Unit: 4 new tests in `Calendar.test.jsx` — clinician + non-terminal
  shows and navigates "Start Consultation"; any role navigates "Open
  Appointment Detail"; non-clinician role hides "Start Consultation";
  terminal (`completed`) status hides "Start Consultation" for a
  clinician while "Open Appointment Detail" stays visible. Uses the same
  marker-route pattern already established in
  `EncounterWorkspace.test.jsx` (a lightweight `useLocation()`-reading
  marker component at each destination route, asserted via
  `data-testid`), avoiding mounting the much heavier real destination
  pages.
- `npx eslint` on the touched file: 0 errors (pre-existing i18n warnings
  only, consistent with the rest of this file); full-project
  `npm run lint`: 3315 warnings, well under the 4908 ratchet.
- `npm run build`: clean. `npm run size`: all 4 budgets green (initial
  bundle 330.07/350 kB, largest lazy chunk 109.92/115 kB, RichTextEditor
  chunk 125.06/130 kB, initial CSS 13.59/18 kB).

See `TP243`/`TR243` for the recorded test plan and outcomes.
