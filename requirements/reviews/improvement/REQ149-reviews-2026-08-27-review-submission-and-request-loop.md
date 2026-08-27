---
id: REQ149
type: improvement
feature: reviews
created: 2026-08-27
updated: 2026-08-27
status: done
parent: null
related: [PLAN189, TP209, TR209]
---

# REQ149 — Review submission + post-visit request loop (P1-06)

## Why this slice

Phase 1 slice `P1-06` (`project-plans/phase-plans/01-phase1-close-the-gates.md`).
`ReviewsService` (`backend/src/reviews/`) shipped long ago with a full
admin-moderation surface — `reviews` (query), `respondToReview`,
`deleteReview` — but **no creation path at all**, confirmed by reading
the service and resolver in full before starting. A patient has never
been able to leave a real review anywhere in this codebase; the whole
reputation flywheel (`P1-06`'s own tracker note: "Reputation flywheel
has no first step. Flagged 2026-08-22, still open") had no first step.

The `new_review` notification event type was already reserved,
defaulted, and classified (`marketing` category) in
`notification-trigger.service.ts` specifically for this, with an
explicit comment naming the exact gap this slice closes: "ReviewsService
has no creation path at all to hook into — confirmed by grep, a separate
gap."

## User story

As a patient, after my appointment is marked completed, I want to be
invited to leave a review for my clinician, and be able to submit a
star rating and comment for that specific visit — once, not repeatedly
— so future patients can see honest feedback when choosing a doctor.

## Acceptance criteria

- **Given** an appointment transitions to `completed`, **then** the
  patient (if they have a linked login) receives a `new_review`
  notification inviting them to review, honouring their existing
  notification preferences, quiet hours, and daily frequency cap (all
  pre-existing `notification-trigger.service.ts` machinery, reused
  unchanged).
- **Given** a patient's own completed appointment (or a genuine
  dependant's), **when** they submit a star rating (1-5) and a comment,
  **then** a real `Reviews` row is created, `clinician_id`/`clinic_id`
  derived from the appointment itself, never from client input.
- **Given** an appointment that is not the caller's own (or a genuine
  dependant's), **when** they attempt to submit a review for it,
  **then** the request is rejected as not found — the same
  `ownAndDependantPatientIds()` self-scope `REQ065` already established
  for prescriptions/test-results/patientTimeline.
- **Given** an appointment that is not yet `completed`, **then**
  submission is rejected with a specific, actionable message.
- **Given** an appointment that already has a review, **when** a second
  submission is attempted (sequentially or under genuine concurrency),
  **then** it is rejected as a clean conflict, never a duplicate row and
  never a raw constraint error.
- **Given** a patient viewing their own appointment history, **then**
  they can see, per completed appointment, whether they've already
  reviewed it (`has_review`), and are shown a submission form only when
  they haven't.
- **Given** a public visitor (or a patient mid-booking) viewing a
  clinician's profile or the booking wizard, **then** the clinician's
  real aggregate rating and review count are shown, when at least one
  review exists — never a fake "0.0" for a never-reviewed clinician.

## Non-functional / compliance

- ⚖️ **`SEC-13`** (`FRONTEND_RULES.md`): patient reviews for named
  doctors carry advertising-regulation risk in India. This slice builds
  the real feature per the requested `P1-06` scope; the counsel
  sign-off `SEC-13` calls for before a real launch has not happened in
  this session — logged in `context/open-questions.md` #19, not
  silently skipped.
- One review per appointment, enforced at the database level
  (`@@unique(appointment_id)`), not just application logic — the same
  "the DB is the real backstop, the pre-check is just a clean error"
  pattern this session's own `P1-05` slice established for booking
  idempotency.

## Deliberately NOT built

- The staff-facing `pages/clinicians/detail.jsx` admin page's own
  rating/review display (`context/open-questions.md` #8) — that page
  uses a separate canonical-dialect query with no rating field; this
  slice wired rating into the *public/patient* dialect only
  (`doctor-profile.jsx`, `booking/index.jsx`), where the feature was
  actually asked for. Noted as a small, additive follow-up in #8's own
  updated status.
- Any change to the existing admin moderation surface
  (`respondToReview`/`deleteReview`) — unchanged, still the only
  moderation path.
