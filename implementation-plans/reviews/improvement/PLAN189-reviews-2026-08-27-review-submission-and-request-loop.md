---
id: PLAN189
type: improvement
feature: reviews
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ149
related: [TP209, TR209]
---

# PLAN189 — Review submission + post-visit request loop (P1-06)

## Design

**Creation path** — `ReviewsService.create(input, user)`: loads the
appointment directly (no cross-service dependency on
`AppointmentsService`), self-scopes via
`PatientsService.ownAndDependantPatientIds()` (Hard Rule 6, the exact
`REQ065` pattern), requires `status === 'completed'`, derives
`clinician_id`/`clinic_id` from the appointment row (never trusts a
client-supplied FK for something the appointment already establishes).
A pre-check gives a clean `ConflictException` for the common case; the
new `@@unique(appointment_id)` constraint (replacing the old plain
index — a unique index serves the same lookup, so nothing is lost) is
the real race-safe backstop for a genuinely concurrent duplicate, caught
via its `P2002` error code and mapped to the same clean message.

**The request loop** — `AppointmentsService.transitionStatus()`'s
`'completed'` branch (shared by `completeAppointment` and every other
path that reaches it) now calls `notifyLinkedProfile('patient_id', ...,
'new_review', ...)`, mirroring `notifyCancellation()`'s own established
shape exactly. `new_review` was already fully reserved and defaulted in
`notification-trigger.service.ts` — this is purely the missing hook, not
new notification-pipeline work. `action_url` points at
`/patient/appointments?review=:id`, a new query-param deep link
`patient/Appointments.jsx` reads the same way it already reads
`?reschedule=:id`.

**`has_review`** — a `@ResolveField()` on `AppointmentsResolver`
(matching this codebase's own established pattern, e.g.
`PatientsResolver.appointments`), computed only when a query selects
it — no eager cost on every appointments list. Backed by
`ReviewsService.hasReviewForAppointment()`, deliberately ignoring
`is_deleted` to match the real DB-level guarantee `create()` relies on:
an admin-moderated-away review still permanently occupies the
`@@unique` slot, so "already reviewed" must read as true regardless of
moderation state.

**Public rating display** — `PublicService.getClinician()` (backing
`doctor-profile.jsx`) never called the existing `ratingFor()` helper at
all (only the listing query, `getClinicians()`, did) — a real,
previously-unnoticed gap, not new aggregation logic. One added call,
two new fields on `PublicClinicianType`. `booking/index.jsx`'s own
clinician-header query gained the same two fields for the same reason.

## A cross-cutting module-wiring decision worth recording

`ReviewsService` now depends on `PatientsService` (self-scoping) and
`AppointmentsResolver` now depends on `ReviewsService` (the resolve
field) — checked for cycles before wiring: `PatientsModule` has zero
imports of its own, `ReviewsModule` imports only `PatientsModule`, and
neither imports `AppointmentsModule` — safe. `NotificationTriggerService`
needed no explicit import at all (`NotificationsModule` is `@Global()`),
matching every other domain that already dispatches notifications.

## Testing

Backend: `reviews.service.spec.ts` (+16 cases: `create()`'s full
validation chain including the dependant-appointment allow case, the
Hard-Rule-6-derived-FK assertion, the P2002 race-mapping;
`hasReviewForAppointment`), `reviews.resolver.spec.ts` (+2: the
`patient`-only gate, argument passthrough), `appointments.service.spec.ts`
(+4: the `new_review` dispatch fires only on an actual completing
transition, never a re-transition or an unrelated one, and is silently
a no-op for an unlinked patient), `public.service.spec.ts` (+2:
`getClinician`'s rating/zero-review cases). New integration spec
`reviews-submission.int-spec.ts` (8 cases) proves the whole loop against
the real backend: real auth-gate rejection, real self-scope rejection
across a synthetic org-B patient actor (added — none previously
existed), real `has_review` flip, real conflict-on-resubmit, and the
public dialect's real rating reflecting a just-created review.

Frontend: new `Appointments.test.jsx` (5 cases) for the "Leave a
Review"/"Review submitted" flow this slice added to
`patient/Appointments.jsx`, including a dedicated axe-core pass on the
open dialog. A genuine MockedProvider gotcha found and fixed while
writing it, worth carrying forward: **a `cache-and-network` query
returning nested objects with their own `id` fields needs explicit
`__typename` on every nested mock object, even with
`MockedProvider addTypename={false}`** — that prop is deprecated in the
installed Apollo Client version and silently has no effect; without
`__typename`, `InMemoryCache` can't normalize the nested entities and
the query resolves to empty data with no error surfaced anywhere. No
prior test file in this codebase exercised a `cache-and-network` query
with nested `id`-bearing objects, so this was never hit before.

## Outcome

Backend: 102/102 unit suites, 1696/1696 tests; 6/6 integration suites,
398/398 tests (including the new spec); `tsc --noEmit`/`eslint` clean;
`matrix-coverage` unaffected (`reviews` was already a classified
domain — a new mutation on an already-classified resolver needs no new
matrix row). Frontend: new test file 5/5; lint unchanged at the
1,906-warning ratchet; build and `size-limit` green. See TR209 for the
full run log.
