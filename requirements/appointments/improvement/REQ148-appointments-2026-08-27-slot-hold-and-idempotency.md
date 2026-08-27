---
id: REQ148
type: improvement
feature: appointments
created: 2026-08-27
updated: 2026-08-27
status: done
parent: null
related: [PLAN188, TP208, TR208]
---

# REQ148 — Server-side slot hold + booking idempotency (P1-05)

## Why this slice

Phase 1 slice `P1-05` (`project-plans/phase-plans/01-phase1-close-the-gates.md`).
`FRONTEND_RULES.md`'s `BOOK-2` ("a slot MUST be held server-side the
moment the user selects it") and `BOOK-3` ("every booking mutation MUST
send a client-generated idempotency key") were both unimplemented before
this slice — confirmed by grep, no `SlotHold`/`idempoten*` code existed
anywhere in `backend/src`.

**Scope correction found before writing any code**: the slice's own exit
criterion — "two browsers cannot book the same slot" — is *already*
guaranteed at the database level by the `Appointments` table's own
Postgres EXCLUDE constraint (`P3.1`, live-proven by
`test/integration/booking-concurrency.int-spec.ts`, unaffected by this
slice). This slice's real, net-new scope is therefore narrower than its
own title suggests: (1) a slot *hold*, which is UX — it stops a second
patient from spending three minutes on the rest of the wizard for a slot
someone else is already mid-booking on, not a second correctness
mechanism: and (2) the idempotency key, which genuinely was missing and
is what actually delivers "a double-tap cannot create two appointments"
(the EXCLUDE constraint alone would instead reject a retried request with
a confusing "slot no longer available", not treat it as a no-op).

## User story

As a patient booking an appointment, once I select a time slot, I want
that slot reserved for me while I finish the rest of the booking wizard,
with a visible countdown, so another patient can't take it out from under
me mid-flow — and if my booking request is retried (a flaky network, a
resubmit after a crash, an accidental double-tap), I want to end up with
exactly one appointment, never two, and never a confusing error for what
was really the same request.

## Acceptance criteria

- **Given** a free slot, **when** a patient selects it, **then** the slot
  is held server-side with a TTL and a real, server-issued expiry time is
  returned to the client.
- **Given** a slot already held by another patient, **when** a second
  patient tries to hold or select it, **then** they are rejected with a
  clear message and the slot already reads as unavailable in the slot
  list (not merely rejected on hold-attempt).
- **Given** an active hold, **when** the holder's booking succeeds,
  **then** the hold is released as a side effect of that success, with no
  separate action required.
- **Given** an active hold, **when** its TTL expires before the patient
  completes the wizard, **then** the client returns them to the slot
  picker with a clear message, other slots' state intact.
- **Given** a booking mutation carrying a client-generated idempotency
  key, **when** the exact same request is retried (sequentially or
  under genuine concurrency), **then** every retry returns the SAME
  appointment id and exactly one appointment row is ever persisted —
  never a second row, and never a "slot unavailable" error for the
  retry itself.
- **Given** a booking mutation with no idempotency key, **then** behaviour
  is byte-for-byte unchanged from before this slice (backward compatible,
  optional field).

## Non-functional

- The hold is Redis-backed (TTL-native, and losing a hold on a Redis
  restart is a UX inconvenience, never a correctness problem — the
  EXCLUDE constraint remains the real backstop). The idempotency key is a
  durable Postgres row (`AppointmentIdempotencyKeys`), since it must
  survive to guarantee the "exactly one appointment" contract.
- Implemented once per GraphQL dialect (canonical `AppointmentsResolver`/
  `AppointmentInput` and public/patient-self-serve `PublicResolver`/
  `BookPatientAppointmentInput`), matching this codebase's established
  "two dialects, deliberately separate implementations" precedent — never
  unified into one shared resolver.

## Deliberately NOT built

- Full wizard-state resumability (`BOOK-18`'s own "reopening returns the
  user with a clear 'Continue your booking?' prompt", restoring slot/
  patient-detail/step position after an app kill) — a distinct, larger
  feature no page in this codebase has built yet. This slice builds only
  the idempotency-key half of `BOOK-18`'s contract (the key itself
  persists across a reload so a resubmit reuses it), not full step
  resumability.
- A slot hold on the internal staff booking wizard
  (`appointments/create.jsx`, the canonical dialect's own UI) or on
  session/hybrid-mode "join this session" selection (capacity-shared,
  not exclusive — a hold there would be actively wrong, not just unused).
  The canonical dialect's `holdAppointmentSlot`/`releaseAppointmentSlot`
  mutations exist and are tested, in case a future slice wants them, but
  no frontend wiring was added for the staff wizard in this pass.
