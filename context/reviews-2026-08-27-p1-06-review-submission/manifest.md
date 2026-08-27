---
id: CTX-reviews-2026-08-27-p1-06-review-submission
type: improvement
feature: reviews
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ149
related: [PLAN189, TP209, TR209]
---

# reviews — submission + post-visit request loop (2026-08-27)

Phase 1 slice **P1-06** (`project-plans/phase-plans/01-phase1-close-the-gates.md`),
the 6th of a 15-slice batch. `ReviewsService` had a full admin-moderation
surface but genuinely no creation path at all — confirmed by reading the
service/resolver in full before starting. This slice is that missing
first step of the reputation flywheel.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ149 | [Review submission + post-visit request loop](../../requirements/reviews/improvement/REQ149-reviews-2026-08-27-review-submission-and-request-loop.md) |
| implementation-plans | PLAN189 | [implementation plan](../../implementation-plans/reviews/improvement/PLAN189-reviews-2026-08-27-review-submission-and-request-loop.md) |
| test-plans | TP209 | [test plan](../../test-plans/reviews/improvement/TP209-reviews-2026-08-27-review-submission-and-request-loop.md) |
| test-results | TR209 | [results](../../test-results/reviews/improvement/TR209-reviews-2026-08-27-review-submission-and-request-loop.md) |

## What shipped

- **`ReviewsService.create()`** — the missing creation mutation
  (`submitReview`, `patient`-only gate), self-scoped via the same
  `ownAndDependantPatientIds()` helper `REQ065` established, deriving
  `clinician_id`/`clinic_id` from the appointment (Hard Rule 6), backed
  by a new `@@unique(appointment_id)` constraint (replacing a plain
  index) as the real race-safe backstop.
- **The request loop** — `transitionStatus()`'s `'completed'` branch now
  dispatches the `new_review` notification event, already fully
  reserved and defaulted but never wired until this slice — the exact
  gap its own code comment named.
- **`has_review`** — a new `@ResolveField()` on `AppointmentsResolver`,
  backing a real "Leave a Review" / "Review submitted" toggle on
  `patient/Appointments.jsx`.
- **Public rating display** — `getClinician()` (backing
  `doctor-profile.jsx`) never called the existing `ratingFor()` helper
  at all; now does, plus `booking/index.jsx`'s clinician header.

## A real, previously-invisible gap found and fixed

`PublicService.getClinician()` (the single-clinician-profile query) had
**never** included rating/reviews, even though the sibling listing query
(`getClinicians()`) has since `P3.4`. `doctor-profile.jsx` — the actual
public doctor profile page — has shown no rating at all since the day it
shipped. One added call to the existing `ratingFor()` helper closes it.

## A real MockedProvider testing gotcha found and fixed

Writing `patient/Appointments.test.jsx` (a genuinely new test file — no
prior coverage of this page existed) surfaced a real Apollo Client
behavior: `cache-and-network` queries returning nested `id`-bearing
objects silently resolve to empty data in `MockedProvider` unless every
nested mock object carries an explicit `__typename` — `addTypename={false}`
is deprecated in the installed Apollo version and has no effect. No
prior test in this codebase had hit this (nothing else tests a
`cache-and-network` query with this shape). Documented in `PLAN189` for
future test-writing in this codebase.

## Verification

Backend: 102/102 unit suites, 1696/1696 tests; 6/6 integration suites,
398/398 tests (new `reviews-submission.int-spec.ts`, 8/8 — including a
newly-added `patientB` actor for real cross-org self-scope testing);
`tsc --noEmit`/`eslint` clean. Frontend: new `Appointments.test.jsx`
5/5 (including an axe-core pass); lint unchanged at the 1,906-warning
ratchet; build and `size-limit` green.

## Deliberately not built

`SEC-13`'s counsel sign-off (advertising-regulation risk for named-
doctor reviews in India) — logged in `context/open-questions.md` #19,
not silently skipped. The staff-facing `clinicians/detail.jsx` rating
display — out of scope, see `context/open-questions.md` #8's updated
note.
