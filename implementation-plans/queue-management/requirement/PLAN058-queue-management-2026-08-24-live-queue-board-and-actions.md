---
id: PLAN058
type: requirement
feature: queue-management
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ019
related: [TP085, TR084]
---

# PLAN058 — Live queue board, queue actions, and unbilled-visits report, P0 slice

Slice 4 of 6 in the current Phase 1 MVP pass (REQ017 → REQ020 → REQ021 →
**REQ019** → REQ018 → REQ032, dependency order). REQ019 needed REQ017
(session/token mode — real) and REQ020 (encounter timestamps — real, though
not actually used by this slice's "average wait," see below); it now
proceeds on top of `REQ042`'s prior check-in/status-tracking slice, which
this bundle extends rather than duplicates.

## Scope

**Built (P0):** the live queue board (`US-QUE-03` — now-serving, next-5
waiting, a same-day retrospective average wait), queue actions (`US-QUE-05`
— call next, recall, skip/park with N-served auto-return, transfer to a
colleague), and the unbilled-visits report (`US-QUE-07`).

**Explicitly deferred (P1, per REQ019's own phase assignment):** QR
self-service check-in (`US-QUE-02`), a patient-facing live position/ETA
view with a real rolling-median throughput (`US-QUE-04`), the mandatory
pre-consultation checklist gating call-next (`US-QUE-06`), and triage/vitals
capture (`US-QUE-08`).

**Not built, and not this slice's to fix:** `US-QUE-01`'s booked:walk-in
token-interleaving ratio. `REQ017`'s own `walkin_ratio` column is
schema-only with no runtime logic — that requirement's own text defers
"hybrid-mode interleaving" as P1, and this slice does not re-open it.
Check-in (`REQ042`) still issues tokens from booking-time sequential
numbering only.

## Design decision: QueueEntries is runtime state on an Appointment, not a standalone tenant record

`REQ019`'s own Data Model Impact section lists `client_org_id` directly on
`QueueEntries`. Built instead with **no `client_org_id` column at all**,
scoped via `clinic.client_org_id` — the same precedent `Appointments` itself
uses (Appointments has no `client_org_id` of its own either), not
`Encounters`' precedent (which does carry a direct, NOT NULL
`client_org_id` because a clinical record must survive the appointment it
originated from). A `QueueEntries` row is deliberately *not* that kind of
record: it is transient operational state for exactly one `Appointments`
row (`appointment_id` unique, `ON DELETE RESTRICT`), created at check-in and
deleted outright on cancel/reset — carrying its own tenant column would be
denormalization with no independent lifecycle to justify it.

## Design decision: sync inside the SAME transaction as the appointment's own status write, not a second frontend action

Check-in, start-consultation, complete, and no-show are all existing
`AppointmentsService.transitionStatus()` calls (`REQ042`'s own methods —
`checkIn`/`startConsultation`/`complete`/`markNoShow`/`cancel`/
`resetAppointmentJourney`). Rather than add a second, separately-called
queue mutation the frontend would have to remember to fire alongside each
of those, `QueueService.syncFromAppointmentStatus(tx, appointment, status)`
is called *inside* `transitionStatus`'s own `$transaction`, passed the same
`tx` client. This means:

- `checkInAppointment` (already wired into `waiting-room/index.jsx` since
  `REQ042`) now also materializes a `QueueEntries` row, with zero frontend
  change to that existing page.
- The appointment's status and its queue state can never observably
  disagree — no window where one write succeeds and the other doesn't.
- `AppointmentsModule` imports `QueueModule` (one-directional — `QueueModule`
  has no dependency on `AppointmentsModule`), avoiding a circular
  module reference.

Status → queue-state mapping: `checked_in` creates (or resets, on a
post-`resetAppointmentJourney` re-check-in) a `waiting` entry;
`in_consultation` → `in_progress`; `completed` → `done` (and triggers
`recordServed()`, below); `no_show` → `no_show`; `cancelled` and `scheduled`
(the reset target) delete the entry outright — a cancelled or reset
appointment has nothing to queue.

## Design decision: "average wait" is a same-day retrospective, not the deferred predictive ETA

`US-QUE-03`'s acceptance criterion only asks for "average wait" on the
staff-facing board — the *predictive*, rolling-median-across-many-days ETA
is `US-QUE-04`'s own explicit ask, and that story is P1 (blocked on real
`checked_in → completed` volume accumulating, which is itself brand new as
of `REQ020`). Built as: mean of `(called_at - checked_in_at)` across today's
`done` entries for this clinician only. Cheap, real, and honestly scoped —
not a placeholder pretending to be the deferred feature.

## Design decision: auto-return counts "served," not "called"

`US-QUE-05`'s acceptance criterion says a skipped patient returns "after N
other patients have been served" — built as: every `completed` transition
(not `called`, not `in_progress`) increments `served_since_skip` on every
*other* `skipped` entry for that clinician. A patient who is called but then
also skipped, or who no-shows, never counts as "served" toward another
skipped patient's return threshold, matching the plain-language reading of
the acceptance criterion.

## Data model

`backend/prisma/migrations/20260824030000_queue_management/migration.sql`:

- `QueueEntries`: `appointment_id` (unique, `ON DELETE RESTRICT`),
  `clinic_id`, `clinician_id`, `token_no` (nullable — null for slot-mode
  bookings, matching `Appointments.token_no`'s own nullability), `status`
  (`waiting|called|in_progress|done|skipped|no_show`, free-text — REQ042's
  established additive-convention style, not a Postgres enum),
  `checked_in_at`, `called_at`, `skip_return_after`/`served_since_skip` (the
  auto-return counters, above).
- `QueueEvents`: append-only audit trail, mirroring `AppointmentStatusLogs`
  exactly (`action`, `reason?`, `changed_by_user_id?`), `ON DELETE CASCADE`
  from `QueueEntries`.

## Backend

`backend/src/queue/` — module, resolver, service, DTOs, entities, 33 test
cases (`queue.service.spec.ts`). New queries: `queueEntries` (org-wide
listing, no argument — the shape the tenancy matrix and any future
cross-clinic report need, since `queueBoard`/`clinicQueue` both take an id
from the org under test and so can't stand in for a plain "list mine"),
`queueBoard(clinician_id)`, `clinicQueue(clinic_id)`, `unbilledVisits
(clinic_id)`. New mutations: `callNextInQueue`, `recallQueueEntry`,
`skipQueueEntry`, `transferQueueEntry`. Role gate on every one:
`manager`/`admin`/`super_admin`/`clinician`/`staff`/`receptionist` — the
identical set `appointments.resolver.ts`'s own sibling journey mutations
use in this same codebase (kept the harmless `receptionist`+`staff` pairing
CLAUDE.md documents, matching this specific file's own existing convention
rather than inventing a different role list for a closely related domain).

Self-scoping: a `clinician` caller's `queueEntries`/`clinicQueue`/
`queueBoard` are restricted to their own queue; `manager`/`admin`/`staff`
see the whole clinic's. `transfer` additionally validates the target
clinician belongs to the *same clinic* before reassigning both the
`Appointments.clinician_id` and the `QueueEntries` row in one transaction.

`appointments.service.spec.ts` needed one change: `AppointmentsService`'s
constructor now takes `QueueService`, mocked as a no-op in that spec (its
own real behavior is exercised in `queue.service.spec.ts` instead, not
re-proven bit-for-bit in every appointments test).

## Frontend

- `frontend/src/pages/queue/index.jsx` — the staff board: a clinician
  picker (auto-selects a `clinician`-role caller's own id via
  `user?.clinician?.id`, the established convention from
  `clinician/Availability.jsx`), now-serving card with Call Next/Recall,
  a waiting table (skip/transfer row actions), and an unbilled-visits
  panel. Subscribes to `queueUpdated(clinic_id)` and refetches on every
  event.
- `frontend/src/pages/queue/display.jsx` — the TV/waiting-room display at
  `/queue/display/:clinicianId`, a distinct large-type rendering of the
  same `queueBoard` data. Bare route (no `AppShell` chrome), mirroring the
  `/video/:id`/`/prescriptions/:id/print` precedent. Deliberately polls
  every 15s rather than using the real-time subscription — a passive,
  read-from-across-the-room screen trading the interactive board's
  sub-2s NFR for simplicity, not by oversight (recorded here, not silently).
- `AppShell.jsx`'s `NAV_CONFIG` gains a "Live Queue" entry
  (`admin`/`super_admin`/`manager`/`receptionist`/`staff`/`clinician`) — the
  pre-existing `waiting-room` page has none at all (a gap this slice did not
  introduce and does not fix, logged here for visibility since it's the
  page conceptually closest to this one).

## Real bugs found and fixed this slice

**Module-recompile race, not a code bug but worth recording**: creating
several new files in quick succession (the whole `queue/` module) followed
immediately by edits to `appointments.module.ts`/`app.module.ts` raced
`nest start --watch`'s own debounced rebuild — the watch process restarted
using a stale file snapshot mid-edit, silently omitting the new module from
the built GraphQL schema with **no error logged anywhere** (schema.gql had
zero `Queue*` types, `tsc --noEmit` was clean, `docker logs` showed a normal
"successfully started"). Only caught by explicitly grepping the generated
schema for the new type names after the fact. Fixed by letting all edits
settle, then a clean `docker restart medibook_backend`. Documented here as
a real lesson: a clean compile and a clean startup log are not proof a
new module actually loaded — check the generated `schema.gql` (or run a
probe query) after adding a module during an active watch session.

**`e2e/queue.spec.js`'s own Transfer-dialog locator ambiguity**: found while
writing the spec (not left latent) — `getByLabel('Transfer to')` substring-
matched both the row's "Transfer to another clinician" icon-button tooltip
and the dialog's own Autocomplete input, since Playwright's `getByLabel` is
substring-matching by default. Fixed by scoping to `page.getByRole('dialog')`
first.

## Testing

- Backend: 33 new cases in `queue.service.spec.ts` — tenant isolation and
  self-scoping on every query, `callNext`'s ordering and empty-queue
  rejection, `recall`'s state-transition guards, `skip`'s default/explicit
  `return_after`, `transfer`'s same-clinic validation, `unbilledVisits`'
  filter shape, and the full `syncFromAppointmentStatus` matrix including
  the auto-recall counter logic (increment, threshold, and "never counts
  itself" cases).
- Tenancy matrix: new `queue` domain (`queueEntries` query) classified in
  `domain-cases.ts`/`fixture.ts` — 9 new passing cases (one per reader
  archetype), `matrix-coverage.int-spec.ts` still green (no unclassified
  domain).
- Frontend: full unit-suite regression (no new component tests — same
  reasoning as `REQ021`: the e2e spec below exercises every interactive
  path against the real backend, and there was no existing test file for
  either new page to extend).
- e2e: `frontend/e2e/queue.spec.js` — the full `US-QUE-03`/`05`/`07` flow:
  three checked-in patients wait in order, Call Next promotes the earliest,
  Skip parks one, Transfer reassigns one to a colleague and removes them
  from this board, the unbilled-visits panel surfaces a completed-unpaid
  visit, and the TV display renders live.

See `TP085`/`TR084` for the full case-by-case verification record.

## Definition of Done

- [x] Resolvers/DTOs match `REQ019`'s scoped P0 user stories.
- [x] Every tenant-scoped query/mutation uses `orgScopeVia`/`isSameOrg` — no
      ternary or `?? undefined` spelling of the F-01 bug class.
- [x] Self-scoping enforced for a `clinician` caller.
- [x] Unit tests: happy path, tenant isolation, self-scoping, role gating,
      state-machine edge cases — 33 cases, all passing.
- [x] Tenancy matrix extended, `matrix-coverage.int-spec.ts` passing.
- [x] Backend full suite green: 62 suites / 903 tests.
- [x] Backend lint and `tsc --noEmit` clean.
- [x] Backend integration suite green: 4 suites / 234 tests.
- [x] Frontend full suite green: 6 suites / 63 tests.
- [x] Frontend lint clean for every touched/new file.
- [x] Frontend build succeeds.
- [x] Responsive: the waiting table uses `TableContainer` from the start
      (no retrofit needed this time).
- [x] Live e2e spec green against the real backend, not mocks.
- [x] Committed as its own vertical slice.
