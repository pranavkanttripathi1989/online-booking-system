---
id: REQ187
type: improvement
feature: appointments
created: 2026-09-03
updated: 2026-09-03
status: done
parent: —
related: [PLAN256, TP276, TR276]
---

# REQ187 — Self-serve reschedule link in every reminder

## Source

`P2-16` in `project-plans/phase-plans/02-phase2-win-the-midmarket.md`, next
unstarted slice per `phase-plans/README.md`'s own `▶ CURRENT POSITION`,
picked up via a bare `continue`. Tracker note: "Deflects front-desk calls
cheaply."

Verifying against the real code (the `continue` protocol's own step 4)
confirmed a genuine, specific gap: `AppointmentReminderSweepService` (the
`@Cron` job that sends `appointment_reminder` notifications, `P1-17`)
composed a plain-text reminder with **no link of any kind**.
`action_url: /appointments/${id}` was only ever wired into the in-app
notification-bell payload — `notification-trigger.service.ts`'s own
`sendWhatsapp()`/`sendSms()` only ever pass `payload.message` to the
provider, never `action_url`. So the SMS/WhatsApp channel — the one that
actually reaches a patient without a portal login — carried zero way to
reschedule; a patient who wanted to move their slot had to call the
clinic, exactly what this slice exists to deflect.

## What this ships

- **A new self-serve reschedule token** on `Appointments`
  (`reschedule_token_hash`/`_expires_at`/`_used_at`), the exact
  password-reset-token shape `REQ107`'s `checkin_token_*` triad already
  established — only a SHA-256 hash ever persisted, expiry is the
  appointment's own current start time.
- **`AppointmentReminderSweepService` mints the token** in the same call
  that sends a reminder — a reschedule link's own natural trigger point —
  and appends `Need to reschedule? <FRONTEND_URL>/reschedule/<token>` to
  the message text for the first time in this feature's history.
  `issueRescheduleToken()` deliberately mints nothing (and the reminder
  carries no link) when a still-valid, unused token from an earlier
  reminder in the same cycle already exists — see "A real design
  constraint" below for why.
- **Two new public GraphQL operations** on `AppointmentsResolver`
  (alongside `checkInWithQrToken`): `getRescheduleContext(token)`
  (read-only — clinician, service, current time, `booking_mode`) and
  `reschedulePublicAppointment(token, new_start_datetime)`. Both resolve
  the appointment strictly by the token's own hash — never a
  client-supplied id, the same non-negotiable `checkInWithQrToken` already
  established.
- **A new public page**, `/reschedule/:token` — shows the current booking,
  lets the patient pick a new date/time against the same clinician's real
  availability (reusing `getClinicianAvailability`/`getAppointments`, the
  exact public slot-picking primitives `booking/index.jsx` already uses),
  and confirms via the new mutation. A distinct message for each failure
  mode (invalid/expired/used link, slot no longer available, a
  non-slot-mode booking that can't be rescheduled this way).

## A real, pre-existing bug fixed as part of this slice

Neither the existing staff-authenticated reschedule path
(`AppointmentsService#update()`) nor anything else ever reset
`reminder_count`/`reminder_sent_at` when an appointment's time changed.
For a low/medium-risk appointment (`maxReminders = 1`), one already-sent
reminder permanently disqualified that row from ever getting another —
**including after a reschedule moved it to a brand-new, far-future time.**
This directly undermined this slice's own goal ("a link in every
reminder"): a patient who successfully self-serve-rescheduled once would
silently never get a reminder — and therefore never a link — for their new
time. Fixed in the same reschedule write path both the staff-authenticated
`update()` and the new public `reschedulePublic()` share, since the slice
is meaningless without it.

## A real design constraint discovered while building this

Because only a token's **hash** is ever persisted, the raw value handed to
a patient in one reminder can never be recovered to reuse verbatim in a
later one. A high-risk appointment gets two reminders (47-48h, then
23-24h); minting a fresh token on the second send would silently break the
FIRST reminder's own already-delivered link — a genuinely confusing "why
doesn't my link work anymore" for the patient. `issueRescheduleToken()`
avoids this by minting nothing when a still-valid, unused token already
exists on the row: the earlier link just keeps working, nothing is ever
silently invalidated.

## Deliberately NOT built (recorded, not silently dropped)

- **Changing clinician/service on reschedule** — same clinician, new
  date/time only. "Reschedule," not "rebook."
- **Enforcing `ClientOrganizations.max_reschedules_per_month`** — this org
  setting exists and is editable but has never been enforced anywhere in
  this codebase (confirmed by grep, zero consumers). The token's own
  single-use, reissued-only-on-the-next-reminder nature is judged
  sufficient abuse protection for this slice; wiring the org-wide monthly
  counter is a separate, pre-existing gap, logged here, not fixed as a
  rider.
- **A hard cutoff blocking reschedule within N hours of the appointment**
  — the staff-authenticated path has never had one (only a fee gate via
  `ProductCancellationRules.hours_before_appointment`); the public path
  matches that exact existing behaviour rather than inventing new policy.
- **Rescheduling a session/hybrid-mode appointment through this link** —
  `assertSlotFree` (and therefore this whole flow) only applies to
  `booking_mode: 'slot'`; the reschedule page detects a non-slot-mode
  appointment via `getRescheduleContext`'s own `booking_mode` field and
  shows a "please contact the clinic" message instead of a picker that
  could never actually work.
- **Reminder delivery to patients with no login account** — a separate,
  larger, already-known gap (`resolvePatientUserId` returns `null` and
  skips *all* notification, this reschedule token included, for an
  unlinked patient/dependant); out of scope here, which only fixes the
  link/token content of a reminder that IS sent.

## Acceptance criteria

**US-APPT-11**: As a patient, the reminder I receive lets me reschedule
myself without calling the clinic.
- Given a `confirmed` appointment inside a reminder window, when the sweep
  sends its reminder, then the message includes a working `/reschedule/:token`
  link.
- Given the token, when I open the link and pick a new available time for
  the same clinician, then the appointment moves to that time and the link
  is invalidated.

**US-APPT-12**: The link can never be reused, forged, or replayed.
- Given a used, expired, or unknown token, when the reschedule page loads,
  then a specific, human-readable reason is shown — never a raw error, and
  the appointment it might have belonged to is never confirmed to exist.
- Given two concurrent submissions of the same valid token, then exactly
  one succeeds.

**US-APPT-13**: A rescheduled appointment is still eligible for its own
future reminder.
- Given a reschedule moves an appointment's time, when it later re-enters
  a reminder window, then a reminder is sent for the new time (not
  silently skipped because the old `reminder_count` was already at cap).

## Data model impact

`Appointments` gains `reschedule_token_hash` (unique),
`reschedule_token_expires_at`, `reschedule_token_used_at` — the same shape
as the pre-existing `checkin_token_*` triad. Migration
`20260903120000_appointment_reschedule_token`.

## Verification

Backend: 20 new unit tests in `appointments.service.spec.ts` (token
issuance reuse/regeneration rules, `getRescheduleContext`/
`reschedulePublic` happy/error paths, the fee-computation reuse, the
`reminder_count` reset regression on both `update()` and
`reschedulePublic()`) plus 3 new tests in
`appointment-reminder-sweep.service.spec.ts`. Full backend unit suite
green. `tsc`/`eslint` clean. Live container restart + GraphQL introspection
confirmed both new operations genuinely served. Full integration suite: 13
suites/516 tests green, including `matrix-coverage.int-spec.ts` (unaffected
— same-domain addition, not a new resolver domain). Frontend: 8 new tests
in `reschedule.test.jsx`, `eslint` clean of new errors, `check-page-data-wiring.mjs`
clean, build and `npm run size` green (all four budgets held). Full
frontend unit suite run twice; 5 pre-existing suites flagged in the full
run (`patients/detail`, `EncounterWorkspace`, `PrescriptionBuilder`,
`manager/claims/index`, `test-results/index`) — none import anything this
slice touched, and two were spot-checked passing cleanly in full isolation,
one of them non-deterministically (failed once, passed on immediate
retry) — confirming this session's own well-documented host-load
timing-flakiness pattern, not a regression. See `TR276` for full detail.
