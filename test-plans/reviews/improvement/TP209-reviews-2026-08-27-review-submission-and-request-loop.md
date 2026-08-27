---
id: TP209
type: improvement
feature: reviews
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ149
related: [PLAN189, TR209]
---

# TP209 — Test plan: review submission + post-visit request loop (P1-06)

Well-scoped slice against an already-proven pattern (`REQ065`'s own
self-scoping helper, `P1-05`'s own unique-constraint-as-backstop
pattern) — suggestion stage skipped per `CLAUDE.md`'s conditional rule,
test plan drafted directly.

## Backend — unit

1. `ReviewsService.create()`: rejects a missing appointment; rejects a
   caller reviewing an appointment that isn't their own or a genuine
   dependant's (Hard Rule 6); allows a genuine dependant's completed
   appointment; rejects a not-yet-completed appointment; rejects
   (pre-check) a repeat submission with a clean conflict; maps a
   genuinely concurrent duplicate (P2002 past the pre-check) to the
   same clean conflict; derives `clinician_id`/`clinic_id` from the
   appointment, never from client input even when supplied.
2. `ReviewsService.hasReviewForAppointment()`: true when a row exists
   (regardless of `is_deleted`), false when none does.
3. `ReviewsResolver`: `submitReview` is gated to `patient` only (not
   `admin`/`manager`, unlike every other mutation on this resolver);
   forwards input/user correctly.
4. `AppointmentsService.transitionStatus()`: dispatches `new_review` to
   the patient's linked profile on an actual completing transition;
   never on an unrelated transition (e.g. cancel); never on a re-
   transition to an already-`completed` status; silently a no-op for a
   patient with no linked login account.
5. `PublicService.getClinician()`: includes the real rating/review
   count from the same aggregate the listing query already used; a
   zero-review clinician gets `{rating: undefined, reviews: 0}`, not a
   crash.

## Backend — integration (real Postgres, real auth guard chain)

6. `has_review` reads `false` before any review exists.
7. Submitting a review for a not-yet-completed appointment is rejected
   with a specific message.
8. A different patient (a real, separate org-B actor) cannot review
   another patient's appointment — real tenant isolation, not a mock.
9. The real patient can submit a review for their own completed
   appointment; `has_review` flips to `true` immediately after.
10. A second submission for the same appointment is rejected as a clean
    conflict, never a raw constraint error.
11. A non-patient caller (e.g. a manager) is rejected by the real role
    gate before ever reaching the service.
12. `getClinician` (public dialect) reflects the real rating/review
    count after a review exists.

## Frontend

13. `patient/Appointments.jsx` shows "Leave a Review" for a completed
    appointment without one, and opens the submission dialog.
14. Shows a "Review submitted" status chip, not a button, when
    `has_review` is already true.
15. `Submit Review` stays disabled until both a star rating and a
    non-empty comment are given, with inline text explaining what's
    missing (`UI-11`).
16. A successful submission calls the mutation with the right
    variables, shows success feedback, and the list reflects the
    now-true `has_review` state (`DATA-9`).
17. The open review dialog has zero axe-core violations.
18. Lint, build, and `size-limit` all green; lint warning count does
    not exceed the existing ratchet baseline.

## Deliberately not covered

- A live-browser pass of the countdown-free review dialog itself (the
  star `Rating` component's visual behaviour) — no browser-automation
  tool was available this session; the underlying mutation, gating, and
  dialog logic are covered by (13)–(17) above.
- The staff-facing `clinicians/detail.jsx` rating display — out of
  scope, see `REQ149`'s own scope note and `context/open-questions.md`
  #8.
