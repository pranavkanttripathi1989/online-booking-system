---
id: REQ164
type: improvement
feature: scheduling-engine
created: 2026-08-30
updated: 2026-08-30
status: done
parent: REQ017
related: [PLAN223, TP243, TR243]
---

# REQ164 — Clinician calendar: "Start Consultation" + "Open Appointment Detail" from the appointment panel

## Why this slice

The user shared the clinician Calendar page's appointment detail panel
(Patient info, Time & Duration, Service, a single "View Patient" button)
and asked for two more actions directly from that panel: launching the
consultation, and opening the full appointment detail page — explicitly
asking for competitor grounding and a proper implementation/technical plan
before building, aiming for a more user-friendly result.

Two research passes (real code + this repo's own competitive-analysis
documents) confirmed the gap and its low-risk shape before any code was
written:

- `frontend/src/pages/clinician/Calendar.jsx`'s appointment Drawer (the
  panel the user's screenshot shows — opened by clicking an event card,
  distinct from the lighter hover `ApptPopover`) had exactly three
  actions in its footer: "Join Video Call" (video appointments only),
  "View Patient" (→ the *patient* record, not the appointment), and
  "Close". No consultation-launch action and no appointment-detail link
  existed anywhere in this panel.
- The exact pattern to reuse already exists and already ships tested:
  `frontend/src/pages/appointments/detail.jsx` renders a "Start
  Consultation" button gated on `hasRole('clinician')` and a non-terminal
  status (`!['cancelled','completed','no_show'].includes(status)`), which
  simply navigates to `/clinician/encounters/:appointmentId` —
  `EncounterWorkspace.jsx` auto-creates/loads the encounter on arrival, so
  no new mutation or backend field is needed. "Open appointment detail"
  is equally direct: the route `/appointments/:id` already exists and
  every calendar event already carries its own appointment `id`.
- **Competitive grounding**: this repo's own `REQ042` (queue-management,
  done) already built a `startConsultation` mutation and a waiting-room
  attendance/journey model, explicitly citing Semble's `Journey`/`dna`
  object (`REQ003`, `semble-competitive-gap-analysis-requirements.md`) as
  precedent — but wired only into the front-desk waiting-room page, never
  the clinician's own calendar. Mainstream clinic-management/EHR products
  (Semble, Cliniko, Practo Ray, athenahealth) commonly support one-click
  "start consultation" directly from a day-view calendar card alongside a
  secondary "view full detail" affordance — general industry knowledge,
  not independently re-verified live this session, and consistent with
  `project-plans/analysis/05-competitive-analysis.md`'s own standing
  caveat that its competitor data was never live-verified. No PRD-v2
  `FR-*` addresses this calendar-popover gap directly, so this is framed
  as closing a UX-completeness gap against an already-precedented,
  already-shipped pattern (`appointments/detail.jsx`'s own button) rather
  than inventing new product scope.

## User story

As a clinician viewing my calendar, when I open an appointment's detail
panel, I can launch the consultation workspace or open the full
appointment detail page in one click — the same two actions already
available from the appointments list's own detail page — instead of only
being able to view the patient record.

## Acceptance criteria (Given/When/Then)

- **AC1**: Given a clinician viewing a non-terminal (not
  cancelled/completed/no-show) appointment's detail panel, when it opens,
  then a "Start Consultation" button is shown; clicking it navigates to
  `/clinician/encounters/:appointmentId` for that appointment.
- **AC2**: Given any authenticated calendar viewer (any role), when the
  appointment detail panel opens, then an "Open Appointment Detail"
  button is always shown; clicking it navigates to `/appointments/:id`
  for that appointment.
- **AC3**: Given a non-clinician role (e.g. staff/manager/admin viewing
  another clinician's calendar), when the panel opens, then "Start
  Consultation" is absent — matching `appointments/detail.jsx`'s own role
  gate exactly, not a new/different one.
- **AC4**: Given a terminal-status appointment (cancelled, completed, or
  no-show), when the panel opens, then "Start Consultation" is absent
  even for a clinician, while "Open Appointment Detail" and "View
  Patient" remain available.
- **AC5**: No backend change, no new mutation, no new GraphQL field, no
  new route — both actions reuse existing, already-tested routes and an
  already-established gating condition.

## Data model impact

None. Purely additive frontend UI reusing existing routes
(`/clinician/encounters/:appointmentId`, `/appointments/:id`) and data
already present on every calendar event object (`id`, `status`).

## Deliberately NOT built this slice

- No change to the lighter hover `ApptPopover` itself (it already offers
  "Click to view full details →", which opens the Drawer these two new
  actions live in) — no scope creep into a second, redundant action
  surface.
- No new `checked_in` entry added to `theme.palette.appointmentStatus` —
  a real, separate, pre-existing gap noted during research (unrecognized
  statuses fall back to the `confirmed` token) but out of scope for these
  two requested actions.
- No change to `appointments/detail.jsx` itself — it already has both
  concepts; this slice only closes the gap on the calendar's own panel.
- No wiring of the `startConsultation`/waiting-room journey mutation into
  the calendar — that's a `REQ042`/`REQ019` queue-tracking concept,
  deliberately kept separate from the clinical-workspace-launch concept
  this slice adds, matching `appointments/detail.jsx`'s own precedent
  (its "Start Consultation" button is a pure navigation, not a mutation
  call either).

See `PLAN223` for the full technical design and `TR243` for verification
outcomes.
