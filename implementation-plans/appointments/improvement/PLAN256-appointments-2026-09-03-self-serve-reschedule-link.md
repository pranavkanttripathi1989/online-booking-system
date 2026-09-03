---
id: PLAN256
type: improvement
feature: appointments
created: 2026-09-03
updated: 2026-09-03
status: done
parent: REQ187
related: [TP276, TR276]
---

# PLAN256 — Implementation plan: self-serve reschedule link (P2-16)

Full design rationale lives in the approved plan file
(`/Users/pranavkanttripathi/.claude/plans/starry-soaring-bunny.md`) — this
document is the as-built record.

## Migration

`backend/prisma/migrations/20260903120000_appointment_reschedule_token/` —
`reschedule_token_hash` (unique), `reschedule_token_expires_at`,
`reschedule_token_used_at` on `Appointments`, mirroring the pre-existing
`checkin_token_*` triad (`REQ107`) column-for-column.

## `backend/src/appointments/appointments.service.ts`

- **Extracted `maybeChargeRescheduleFee(existing, appointmentId)`** —
  lifted verbatim out of `update()`'s own inline `REQ177` fee-computation
  block (prior-succeeded-payment lookup → `cancellationRulesService` →
  `computeCancellationFee` → a `pending` `AppointmentPayments` row).
  `update()` now calls this helper instead of duplicating the logic;
  behaviour is byte-for-byte unchanged (confirmed by the 5 pre-existing
  `update — reschedule fee` tests all still passing untouched).
- **`update()`'s own transactional `data` object** gained
  `...(timeChanged ? { reminder_count: 0, reminder_sent_at: null } : {})`
  — the bug-fix half of this slice, benefiting the pre-existing
  staff-authenticated reschedule path too, not just the new public one.
- **`generateRescheduleToken(appointmentTime)`** (private) — same shape as
  `generateCheckinToken()`; expiry is the appointment's own current start
  time.
- **`issueRescheduleToken(appointmentId, appointmentTime)`** (public,
  the only caller is `AppointmentReminderSweepService`) — returns `null`
  and mints nothing when a still-valid, unused token already exists on the
  row (see REQ187's own "design constraint" section for why); otherwise
  mints and persists a fresh one, returning the raw value once.
- **`getRescheduleContext(rawToken)`** — hash the token, `findFirst` by
  `reschedule_token_hash` (never a client-supplied id), the same
  not-found/used/expired/wrong-status checks `checkInWithQrToken` already
  established, returns clinician/service/current-time/`booking_mode`.
- **`reschedulePublic(rawToken, newStartIso)`** — same token resolution,
  rejects a past new time, runs `assertSlotFree` only for `booking_mode:
  'slot'` (matching `update()`'s own identical branch), a self-contained
  transaction (row update + `AppointmentResources` time-range sync +
  `reschedule_token_used_at` write + the same `reminder_count`/
  `reminder_sent_at` reset + a status log entry with
  `changed_by_user_id: null`, matching `checkInWithQrToken`'s own
  system-caller convention), then `maybeChargeRescheduleFee()`. Publishes
  `APPOINTMENT_UPDATED_EVENT` same as `update()`. Deliberately its own
  self-contained transaction rather than routing through `update()` itself
  — `update()` carries considerably more surface (status changes, room
  reassignment, notes) an unauthenticated token-only caller must never be
  able to reach.

## `backend/src/appointments/appointment-reminder-sweep.service.ts`

- Injected `AppointmentsService` (same module, no cross-module import
  needed — both are already providers on `AppointmentsModule`).
- `maybeSendReminder()` now calls `issueRescheduleToken()` before
  dispatching; when it returns a raw token, appends
  `Need to reschedule? <FRONTEND_URL>/reschedule/<token>` to the message —
  reusing `prescriptions.service.ts`'s own existing
  `process.env.FRONTEND_URL ?? 'http://localhost:3000'` pattern verbatim,
  not inventing a new env var.

## `backend/src/appointments/appointments.resolver.ts` /
`entities/appointment.entity.ts`

- New `RescheduleContextType` — `clinician_id`, `clinician_name`,
  `service_name`, `current_start_datetime`, `duration_minutes`,
  `booking_mode`.
- `getRescheduleContext` (`@Public() @Query`) and
  `reschedulePublicAppointment` (`@Public() @Mutation(() => AppointmentType)`)
  added on `AppointmentsResolver` itself, alongside `checkInWithQrToken` —
  not `PublicResolver` — since the token-resolution logic lives in
  `AppointmentsService`, not `PublicService`.

## Frontend

- **`frontend/src/pages/public/reschedule.jsx`** (new) — `ReschedulePage`
  reads `getRescheduleContext` on mount and renders one of: loading,
  a specific error state (STATE-6/7, the backend's own message
  surfaced verbatim), a "please contact the clinic" state for a
  non-slot-mode booking, or `ReschedulePicker`. The picker reuses
  `booking/index.jsx`'s own two public-dialect queries verbatim
  (`getClinicianAvailability` for the weekly working-hours grid,
  `getAppointments` for the day's already-booked times) and its exact
  30-minute-step slot-generation logic — a flat grid with a booked slot
  shown `disabled`, not hidden (`BOOK-6`), matching that page's own
  established convention rather than inventing a fresh
  Morning/Afternoon/Evening-grouped picker `booking/index.jsx` itself
  doesn't have either (a real, pre-existing `BOOK-7` gap, not something
  to selectively "fix" only on this one new page). On success, shows the
  new time and, when `reschedule_fee_amount` is non-null, the fee via the
  shared `formatCurrency()` util (`FORM-18`) — the first frontend consumer
  of that field anywhere in this codebase (`REQ177` built it, nothing ever
  displayed it before this).
- **`frontend/src/App.jsx`** — new `/reschedule/:token` route, inside
  `PublicLayout` (unlike P2-15's bare `/checkin` kiosk route) — this page
  is opened from a patient's own phone via an SMS/WhatsApp link, where the
  marketing chrome is harmless, matching `/checkin/:token`'s own
  precedent exactly, not the kiosk one.

## Test file (new)

`frontend/src/pages/public/reschedule.test.jsx` — 8 tests: invalid-token
message, non-slot-mode "contact the clinic" message, context summary
render, a booked slot shown disabled not hidden, a successful reschedule,
a successful reschedule with a fee shown, a real slot-conflict error with
the picker still usable afterward, and an axe-core zero-violations check.
One real test-authoring bug found and fixed while writing it: a booked-slot
fixture hardcoded as a literal `...T09:00:00.000Z` (UTC) rendered as a
different local hour on this IST host — the exact timezone-ambiguous-fixture
class `context/open-questions.md` #15 already documents; fixed by
constructing the fixture the same local-timezone-aware way the component's
own `newStart` is built (`dayjs(...).toISOString()`), not a hardcoded `Z`
literal. A second, unrelated authoring mistake: `error: new GraphQLError(...)`
populates Apollo's `networkError`, not `graphQLErrors` — the correct shape
for a genuine GraphQL execution error is `result: { errors: [new GraphQLError(...)] }`,
matching the precedent already established in `appointments/edit.test.jsx`
and `patients/detail.test.jsx`.

## Verification

Backend: `npx tsc --noEmit`, `npx eslint "{src,apps,libs,test}/**/*.ts"`
clean. `appointments.service.spec.ts`: 134/134 (20 new, all 114
pre-existing unaffected by the fee-logic extraction).
`appointment-reminder-sweep.service.spec.ts`: 14/14 (3 new). Full backend
unit suite: 167 suites/2681 tests, green. Container restarted, recompiled
clean, GraphQL introspection confirmed both `getRescheduleContext` and
`reschedulePublicAppointment` genuinely served. `npm run test:int` (host):
13 suites/516 tests, green, including `matrix-coverage.int-spec.ts`.

Frontend: `npx eslint`: 0 new errors (9 `I18N-1` warnings, the standing
no-i18n-layer-yet pattern, not new debt). `check-page-data-wiring.mjs`:
clean. `reschedule.test.jsx`: 8/8. `npm run build`: succeeds. `npm run
size`: all four budgets held (331.67 kB / 350 kB initial; 109.92 kB / 115
kB largest lazy chunk; 125.06 kB / 130 kB RichTextEditor; 13.59 kB / 18 kB
initial CSS — near-identical to before this slice, since it adds no new
dependency). Full frontend unit suite run twice — 5 suites flagged failing
each full run, none touching this slice's files; two spot-checked in full
isolation, one passing cleanly both times, one failing once then passing
immediately on retry with zero code changes in between — confirms
non-deterministic host-load timing flakiness, this session's own
well-documented pattern, not a regression.
