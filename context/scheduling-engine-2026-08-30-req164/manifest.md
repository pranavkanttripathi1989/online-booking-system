---
id: CTX-scheduling-engine-2026-08-30-req164
type: improvement
feature: scheduling-engine
created: 2026-08-30
updated: 2026-08-30
status: done
parent: REQ017
related: [REQ164, PLAN223, TP243, TR243]
---

# Clinician calendar Drawer: "Start Consultation" + "Open Appointment Detail" (2026-08-30)

The user shared a screenshot of the clinician Calendar page's appointment
detail panel (Patient/Time & Duration/Service, a single "View Patient"
button) and asked for two more actions there — launching the
consultation and opening the full appointment detail page — explicitly
asking for competitor grounding and a proper implementation/technical
plan first, aiming for a more user-friendly result.

Two research passes (real code + this repo's own competitive-analysis
docs) found the gap was narrower and lower-risk than it first looked:
`appointments/detail.jsx` already ships a tested "Start Consultation"
button (clinician-only, non-terminal-status gate, pure navigation to
`/clinician/encounters/:id` — no mutation call) and `/appointments/:id`
already exists as a route — neither action needed any new backend work.
The calendar's own Drawer (opened by clicking an event card — the exact
panel in the user's screenshot, distinct from the lighter hover
`ApptPopover`) simply never had either wired in. Competitive grounding:
this repo's own `REQ042` already built a `startConsultation`
mutation/waiting-room journey model citing Semble's `Journey`/`dna`
object (`REQ003`) as precedent, but only wired into the front-desk
waiting-room page — deliberately kept separate here, matching
`detail.jsx`'s own pure-navigation precedent rather than introducing a
second consultation-launch mechanism.

## What shipped

- `frontend/src/pages/clinician/Calendar.jsx`: 2 new icon imports
  (`MonitorHeartRoundedIcon`, `OpenInNewIcon`), `hasRole` added to the
  existing `useAuth()` destructure, a new `isTerminalAppt` const (mirrors
  `detail.jsx`'s own `isTerminal`), and 2 new Drawer-footer buttons —
  "Start Consultation" (`hasRole('clinician') && !isTerminalAppt`) and
  "Open Appointment Detail" (always visible) — placed between the
  existing "Join Video Call" and "View Patient"/"Close" buttons.
- `frontend/src/pages/clinician/Calendar.test.jsx` (new, 4 tests): both
  buttons render and navigate correctly; "Start Consultation" is hidden
  for a non-clinician role and for a terminal-status appointment.

No backend change, no new mutation, no new route, no new GraphQL field —
purely additive frontend UI reusing two already-existing, already-tested
routes.

## Verification

Frontend unit: 4/4 new tests pass. `eslint` 0 errors (pre-existing i18n
warnings only); full-project lint 3315/4908 warnings, under ratchet.
`npm run build` clean; `npm run size` all 4 budgets green. **Live-verified
end-to-end** against the real dev stack as `clinician@medibook.dev`: the
Drawer for a real "Priya Patient" appointment now shows both new buttons
in the planned order; "Start Consultation" correctly navigated to the
real `EncounterWorkspace` for that appointment (real patient timeline
loaded); "Open Appointment Detail" correctly navigated to the real
`/appointments/:id` page for the same appointment, with matching data.

## Documents

- `requirements/scheduling-engine/improvement/REQ164-*.md`
- `implementation-plans/scheduling-engine/improvement/PLAN223-*.md`
- `test-plans/scheduling-engine/improvement/TP243-*.md`
- `test-results/scheduling-engine/improvement/TR243-*.md`

## Not done this pass, stated not hidden

- No fix to the missing `checked_in` token in
  `theme.palette.appointmentStatus` (falls back to `confirmed`) — a real,
  separate, pre-existing gap noted during research, out of scope here.
- No change to the lighter hover `ApptPopover` itself, and no wiring of
  `REQ042`'s `startConsultation`/waiting-room journey mutation into the
  calendar — both deliberate scope cuts, see `REQ164`'s own account.
