---
id: REQ042
type: improvement
feature: queue-management
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ019
related: [BUG019]
---

# REQ042 — Real check-in status tracking and a real waiting-room queue

First vertical slice of `REQ019` (queue management) — not the full PRD scope
(session/token mode, live queue board with wait-time estimation, the
patient-facing check-in kiosk). Also closes `project-plans/06-execution-plan.md`
P2.2's `waiting-room` item: one of the three genuinely backend-less pages
now has a real backend, so it comes off that list rather than staying
reachable-but-fabricated.

## Why this slice, not the full REQ019

`context/open-questions.md` #11(a) (raised 2026-08-22, still open) frames
the real decision: "is check-in a lightweight extra `Appointments.status`
value... or the full queue/token model the PRD describes? Those are
materially different builds." This slice takes the lightweight path
deliberately — it answers the open question for the *status-tracking* half
only, while leaving the token-mode/wait-time-estimation half exactly as
open as before (those depend on `REQ017`'s session/token mode and
`REQ020`'s encounter timestamps per `REQ019`'s own text, neither of which
exist yet).

## What was built

- `Appointments.status` (`String`, no DB enum — confirmed no migration
  needed) gains two additive convention values: `checked_in`,
  `in_consultation`, alongside the existing `scheduled`/`completed`/
  `cancelled`/`no_show`.
- `AppointmentsService`: `checkIn()`, `startConsultation()`,
  `resetAppointmentJourney()` — all thin wrappers over the existing
  `transitionStatus()` used by `cancel()`/`complete()`/`markNoShow()`,
  inheriting the same tenant-isolation (`loadScoped`), self-scoping,
  audit-log (`AppointmentStatusLogs`), and real-time pubsub behavior for
  free.
- `AppointmentsResolver`: `checkInAppointment`, `startConsultation`,
  `resetAppointmentJourney` mutations, same role gate as the sibling
  `completeAppointment`/`markNoShow` mutations.
- `AppointmentFiltersInput` gains `clinic_id` — the waiting room needs to
  scope to one front-desk location, which `appointments()` couldn't
  previously filter by (only `clinician_id`).
- `waiting-room/index.jsx` rewired off `mocks/store.js` entirely onto the
  real `appointments()` query and the five mutations above (check-in,
  start-consultation, complete, mark-no-show, reset-journey) — the same
  5-stage UI (not-arrived/arrived/in-consultation/departed/dna) now derives
  from real `Appointments.status`, not a fabricated `journey` object.
- `StatusChip.jsx` gains `checked_in`/`in_consultation` entries so any other
  page rendering an appointment's status shows a real label instead of
  falling through to the raw string.
- `scripts/check-page-data-wiring.mjs`'s allowlist: `waiting-room/index.jsx`
  removed (it's real now); `onboarding`/`tasks` remain, unaffected.

## A real, unrelated bug found and fixed while verifying this

`check-page-data-wiring.mjs` had never actually run successfully on this
Windows host outside a Linux container: `new URL('..', import.meta.url).pathname`
returns a POSIX-shaped path with a leading slash before the Windows drive
letter (`/D:/online-booking-system/`), which `path.join`/`fs` then treat as
drive-relative rather than absolute — the next join re-prepends `cwd`,
producing a literal `D:\D:\...` and a scandir `ENOENT`. Fixed with
`fileURLToPath()` instead of `.pathname`, which handles the platform
conversion correctly on both POSIX and Windows. This is why the gate could
still report "0 new" every time CI (a Linux runner) ran it, while silently
never having been runnable from this specific local host at all.

## What this does not do

- No queue "position"/estimated-wait-time — REQ019's own text ties that to
  `REQ017`/`REQ020`, neither built.
- No token/session-mode distinction — every appointment uses the same
  five-stage flow regardless of booking mode.
- No multi-clinic picker on the waiting-room page — `clinic_id` filtering
  exists in the backend contract now, but the page doesn't yet expose a
  clinic selector (a manager overseeing multiple clinics sees every
  appointment across all of them for the selected date, org-scoped as
  before). Logged here, not silently dropped — a small follow-up, not
  blocking.
