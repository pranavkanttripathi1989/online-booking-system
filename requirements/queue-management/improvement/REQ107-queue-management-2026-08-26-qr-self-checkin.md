---
id: REQ107
type: improvement
feature: queue-management
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ019
related: [PLAN147, TP171, TR171]
---

# REQ107 — QR self-check-in for booked appointments

## Why this slice

`REQ019`'s own P1 scope (queue-management, per CLAUDE.md) lists "QR
self-check-in, a predictive rolling-median ETA, mandatory
pre-consultation checklists, triage/vitals" as deferred. The checklist
item was separately closed by `REQ051` (Phase G+3 — "Mandatory
pre-consultation checklist gating `callNext()`"). This slice builds
**only** QR self-check-in: a patient scans a QR code (shown on their
booking confirmation, e.g. `appointments/detail.jsx` or a confirmation
email) to check themselves in at reception without staff involvement,
landing them in the same queue `REQ019`/`REQ042` already built.

The existing check-in path (`appointments.resolver.ts`'s
`checkInAppointment` → `AppointmentsService#checkIn()` →
`transitionStatus()`) is staff-authenticated and requires a `JwtPayload`
via `@CurrentUser()`. A public, unauthenticated caller must not be able
to invoke it directly — that would let anyone check in (or DoS) any
appointment by guessing/enumerating an `appointment_id`. This slice
introduces a scoped, single-use, time-boxed token bound to one specific
appointment, following the exact pattern `auth.service.ts`'s
`forgotPassword`/`resetPassword` already use for password-reset tokens
(random 32-byte token given to the client, only its SHA-256 hash stored
server-side, an expiry timestamp, cleared after one use) — reused, not
reinvented.

## User story

As a patient with a booked, confirmed appointment, I want to scan a QR
code at the clinic to check myself in, so front-desk staff don't have
to manually check me in and I show up in the queue automatically.

## Acceptance criteria

- Given a `confirmed` (or `scheduled`, for a service with no prepayment
  policy) appointment, when its confirmation page/notification renders,
  then a QR code is shown encoding a URL with a single-use token bound
  to that appointment only.
- Given a valid, unexpired, unused token, when the patient scans it and
  the landing page submits it, then the appointment transitions to
  `checked_in` exactly as `checkInAppointment` already does (queue entry
  created via the same `transitionStatus` → `queueService.syncFromAppointmentStatus`
  path), and the token is immediately invalidated (single-use).
- Given an already-used token, when scanned again, then the request is
  rejected with a clear "already checked in" message — not a silent
  success, not a duplicate queue entry.
- Given an expired token (past its time-box — recommended: valid from
  2 hours before `appointment_time` until end of that appointment day),
  when scanned, then the request is rejected with an "expired, please
  see reception" message.
- Given a token for a `cancelled`/`no_show`/`completed` appointment, when
  scanned, then the request is rejected — the appointment's current
  status is authoritative, not just the token's own validity.
- **Security-critical**: a caller must never be able to supply an
  arbitrary `appointment_id` to this public mutation — the token itself
  is the only input; the appointment it resolves to is looked up
  server-side from the token's hash, never trusted from client input.
- A token is scoped to exactly the one appointment it was issued for —
  it can never be replayed against a different appointment.

## Scope

- New public GraphQL mutation `checkInWithQrToken(token: String!)`.
- New public frontend route rendering a QR-scan landing page.
- QR code rendering on the existing appointment confirmation surface
  (patient portal appointment detail, at minimum — email/SMS QR delivery
  is a nice-to-have, not required for this slice's DoD).
- Token generation triggered when an appointment reaches a checkin-
  eligible state (`confirmed`, or `scheduled` for a no-prepayment
  service) — exact trigger point decided in the implementation plan.

## Deliberately out of scope

- Predictive rolling-median ETA and triage/vitals — separate, larger
  `REQ019` P1 items, not touched here.
- QR delivery via WhatsApp/SMS/email — this slice renders the QR in the
  existing patient-portal appointment view only; notification-channel
  delivery is a follow-on, not required for this slice's DoD.
- Re-issuing a fresh token after expiry from the patient side (a patient
  whose token expired sees an "expired, please see reception" message
  and is checked in manually) — self-service re-issue is future scope.
