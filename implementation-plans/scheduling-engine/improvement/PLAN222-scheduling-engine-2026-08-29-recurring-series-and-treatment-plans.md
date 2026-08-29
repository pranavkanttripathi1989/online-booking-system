---
id: PLAN222
type: improvement
feature: scheduling-engine
created: 2026-08-29
updated: 2026-08-29
status: done
parent: REQ163
related: [TP242, TR242]
---

# PLAN222 — Recurring/series appointments + treatment-plan scheduling (P2-10)

## Research (three parallel passes over the real code before designing)

1. **Backend appointment-creation internals** — `AppointmentsService.create()`
   (`appointments.service.ts:428-715`) runs, in order: idempotency-key
   short-circuit, tenant scope, patient self-scope (REQ018), intake-field
   validation (REQ052), prepayment/no-show-risk policy, slot-vs-session-
   mode conflict checking, room assignment, a transaction (advisory-lock-
   guarded count for session/hybrid mode), then the idempotency-key row in
   the same transaction. Two Postgres EXCLUDE constraints
   (`appointments_no_overlapping_booking`, `appointments_no_overlapping_room_booking`,
   both narrowed to `booking_mode='slot'`) plus a resource-level one each
   protect one row's own time range — no batch-level relaxation exists.
   `bulkReschedule()` (`:967-1018`) is the one real bulk-operation
   precedent: individual `$transaction` per row, per-row try/catch,
   partial-success report. `Appointments` has no existing grouping FK.
2. **Frontend booking wizards** — the public wizard uses a separate
   `bookPatientAppointment`/`BookPatientAppointmentInput` (camelCase
   dialect); the staff `BookingWizard` (5 steps) uses `createAppointment`/
   `AppointmentInput`. Neither has any repeat/frequency UI. The existing
   "Bulk Cancel" action (`appointments/index.jsx`) loops the single
   `cancelAppointment` mutation client-side — a useful UI precedent.
3. **Recurrence conventions** — `ClinicianAvailability`/`LunchBreaks`/
   `RoomBlocks`/`SpacerBlocks` all have `recurrence_type`/`recurrence_days`
   fields that are functionally dead beyond day-of-week matching (no
   materialization/expansion exists). `packages/`/`branch-overrides/`
   (REQ054/055) are the concrete recent module-scaffolding precedent.
   `AppointmentReminderSweepService` is the `@Cron` convention (not needed
   here — no sweep required per the design below).

## Design

**One backend concept — `AppointmentSeries`.** Covers both a simple
recurring series (same service, N times) and a heterogeneous treatment
plan (different services over time) as the same shape: a named,
**eagerly-materialized** group of real `Appointments` rows linked by a new
`series_id` FK. "Recurring" vs "treatment plan" (`series_type`) is display
metadata only — the create mutation always takes an explicit array of
occurrences (`{start_datetime, service_id, clinician_id?, notes?}`); a
"weekly recurring" UI flow is just a client-side generator producing that
same array.

**Reuse `AppointmentsService.create()` per occurrence, never
reimplement its validation.** `AppointmentSeriesService.create()` loops
the input occurrences, calling the existing `create()` for each one — full
tenant scope, patient self-scope, intake fields, prepayment/no-show-risk
policy, slot-vs-session-mode conflict checking, and idempotency-key/
EXCLUDE-constraint handling all come along unmodified. Each occurrence
gets its own try/catch (no wrapping transaction across occurrences,
matching `bulkReschedule()`'s own established shape) — one occurrence's
genuine slot conflict never rolls back the others; the mutation returns a
partial-success report (`attempted_count`/`created_count`/`failed_count`/
`failures[]`).

`AppointmentsService.create()` gains a **3rd, internal-only parameter**
(`seriesLink?: {series_id, series_occurrence_no}`) — deliberately **not**
a field on the GraphQL-decorated `AppointmentInput` DTO at all (stronger
than `escalated_from_encounter_id`'s "client-supplied-but-validated"
pattern — this link has no legitimate reason to ever be client-settable).

**Idempotency**: the series-create mutation takes one outer
`idempotency_key`; `AppointmentSeriesService` derives a distinct,
deterministic per-occurrence key (`` `${key}:occ:${i}` ``) for each inner
`create()` call, so a full retry of the whole series-create request is
itself safely idempotent occurrence-by-occurrence. `hold_token` is
deliberately not accepted (a single-slot checkout concept, doesn't apply
across N occurrences).

## What shipped

### Backend

- `backend/prisma/schema.prisma` — new `AppointmentSeries` model
  (`client_org_id?, clinic_id, patient_id, name, series_type, status,
  created_by_user_id?`); `Appointments` gains `series_id`/
  `series_occurrence_no` (both nullable) + FK + index. Hand-written
  migration `20260829030000_appointment_series`.
- `backend/src/appointment-series/` — new module, scaffolded exactly like
  `packages/`: `appointment-series.module.ts`, `.resolver.ts`, `.service.ts`,
  `.service.spec.ts` (12 tests), `dto/appointment-series.input.ts`,
  `entities/appointment-series.entity.ts`. Mutation-response shape
  `{success, userErrors, ..., attempted_count, created_count/cancelled_count,
  failed_count[, failures[]]}`, matching `Availability`/`Blocks`' own
  `{success, userErrors[, entity]}` convention extended with
  `bulkReschedule`'s count fields.
  - `create()` — tenant scope + patient self-scope up front (before
    creating the series row, so an invalid clinic/patient never leaves an
    orphan series with 0 real appointments), then per-occurrence
    `appointmentsService.create()` calls as designed above.
  - `cancel()` — cancels only the series' own non-terminal appointments
    (`scheduled/confirmed/awaiting_payment/checked_in/in_consultation`)
    via the existing `appointmentsService.cancel()`, same per-row
    try/catch partial-success shape; sets the series row's own `status`
    to `'cancelled'`.
  - `findOne()`/`list()` — tenant + patient-self-scope (`ownAndDependantPatientIds`,
    REQ065's pattern) for the former; org-scope only for the staff-facing
    list (matches `packages.list()`'s own shape, `clinic_id` optional).
  - `AppointmentsService` gained a small public `findBySeriesId()` (reuses
    the existing private `toGraphQL`/org+self-scope, no new logic).
- `backend/src/appointments/appointments.service.ts`/`dto/appointment.input.ts`/
  `entities/appointment.entity.ts` — the 3rd `seriesLink` parameter, and
  `series_id`/`series_occurrence_no` added to `toGraphQL()`'s output and
  the `AppointmentType` GraphQL entity (read-only, existing consumers
  unaffected — additive fields).
- `backend/test/integration/setup/{fixture,domain-cases}.ts` — a real
  `AppointmentSeries` fixture row per org (`IDS.appointmentSeriesA/B`),
  `AppointmentSeries` added to the safe-truncation-order table list, and a
  new `CASES` row for `appointment-series` (org-scoped via
  `appointmentSeriesList`, matching `packages`' own row shape).
- `backend/src/app.module.ts` — `AppointmentSeriesModule` registered.
  (This file and `domain-cases.ts` already carried an unrelated, pending,
  uncommitted `TasksModule`/`tasks` registration from earlier work — left
  untouched, staged separately via `git add -p` at commit time so this
  slice's commit doesn't absorb that unrelated feature's history.)

### Frontend

- `frontend/src/graphql/queries.js` — `AppointmentFields` fragment gains
  `series_id`/`series_occurrence_no` (additive); new
  `GET_APPOINTMENT_SERIES_LIST`/`GET_APPOINTMENT_SERIES` queries.
- `frontend/src/graphql/mutations.js` — new
  `CREATE_APPOINTMENT_SERIES_MUTATION`/`CANCEL_APPOINTMENT_SERIES_MUTATION`.
- `frontend/src/pages/appointments/series/new.jsx` (new) — a **separate
  page**, not a retrofit of either existing wizard (both are heavily-
  tested, BOOK-2/3/4-compliant single-booking flows; adding a repeat mode
  to either was judged higher regression risk than composing the same
  building-block queries — `CLINICS_QUERY`/`CLINICIANS_QUERY`/
  `SERVICES_QUERY`/`PATIENTS_QUERY` — in a new page). Patient/clinic/
  clinician pickers, a mode toggle ("Recurring": one service + frequency +
  occurrence count, client-computes N `start_datetime`s via `dayjs`;
  "Treatment Plan": manually add rows, each its own service + date), both
  converging on one `occurrences` array before submit. Shows the
  partial-success report after submit — never a silent "some succeeded"
  outcome (STATE-10/BOOK-19).
- `frontend/src/pages/appointments/series/detail.jsx` (new) — lists every
  real occurrence with its own status; a "Cancel remaining" action; derives
  a `'completed'` display state client-side from whether every occurrence
  has reached a terminal status (never stored server-side, per the
  backend design's own note).
- `frontend/src/App.jsx` — 2 new routes
  (`/appointments/series/new`, `/appointments/series/:id`) under the same
  `RoleGuard` block as `/appointments`/`/appointments/new` (React Router
  v6 scores the literal `series` segment over the `:id` wildcard
  regardless of declaration order — confirmed, no collision).
- `frontend/src/pages/appointments/index.jsx` — a new "New Series" button
  beside "New Booking"; a small `EventRepeatIcon` + tooltip badge on the
  Patient column cell when `row.series_id` is present.
- `frontend/src/pages/appointments/detail.jsx` — a "Part of series" chip
  (with occurrence number) linking to the series detail page, next to the
  existing status chip.

### Deliberately deferred, not silently dropped

- **Patient-portal access to series/detail.jsx** — the new frontend routes
  sit under the staff-only `RoleGuard` block (matching `/appointments/new`'s
  own gate); the backend's `appointmentSeries`/`createAppointmentSeries`/
  `cancelAppointmentSeries` already correctly allow and self-scope a
  `'patient'` caller (per AC7), so a future patient-portal page can call
  the same already-tested queries/mutations with zero backend change.
- A "part of series" badge on `calendar/index.jsx`'s event popover — held
  back deliberately since a separate, concurrent user request was already
  scoped against that exact file (the clinician calendar popover's
  consultation-launch UX); touching it twice in the same session for
  unrelated reasons was judged worse than a small, explicitly-logged gap.
- No per-occurrence cancellation-fee enforcement, no lazy/on-demand
  occurrence generation, no `'completed'` series-status write — all
  matching `REQ163`'s own stated scope cuts.

## Real, non-obvious findings during implementation

1. **A Prisma schema-vs-migration drift risk, caught before applying**:
   the first draft of the `AppointmentSeries` model declared
   `client_org_id String?` with no `@relation` field, while the migration
   SQL added a real FK constraint to `ClientOrganizations` — `prisma
   validate` doesn't catch this class of drift (a hand-written SQL FK with
   no matching Prisma relation field). Fixed by adding the
   `client_organization ClientOrganizations? @relation(...)` field,
   matching `RevenueShareRules`' own already-correct precedent — checked
   before applying the migration, not after.
2. **The host and the Docker container maintain separate generated Prisma
   Clients.** `docker exec medibook_backend npx prisma generate`
   regenerates the client inside the container only; `npm run test:int`
   (which CLAUDE.md's own convention requires running from the host, not
   `docker exec`) still uses the host's own `node_modules/@prisma/client`,
   which needs its own separate `npx prisma generate` run. Missing this
   surfaced as `Cannot read properties of undefined (reading 'createMany')`
   in the integration fixture — not immediately obvious that the failure
   pointed at a stale generated client rather than a real code bug.
3. **A genuine MUI-Autocomplete-plus-Apollo-mock gotcha**: `MockedProvider`'s
   `addTypename={false}` only controls whether Apollo injects `__typename`
   into the *outgoing* query document — it does **not** exempt a mock's
   *response* data from needing `__typename` on every nested object.
   Without it, `InMemoryCache` silently normalizes every field down to
   `{}` on read (confirmed via a direct diagnostic: `patients: {data:
   [{}]}` instead of the real row), which then renders as literal
   "undefined (undefined)" in a rendered `Autocomplete` option with zero
   error anywhere. `pages/patients/detail.test.jsx`'s own `PATIENTS_QUERY`
   mock had already independently discovered and worked around this exact
   gap — matched its convention rather than rediscovering the fix from
   scratch a second time. **Any future GraphQL mock feeding a page that
   reads a nested object's fields (not just checking `success`/an id)
   needs `__typename` on every nested level of its `result.data`.**
4. Two pre-existing test-authoring gotchas already documented in this
   codebase's own history recurred: `userEvent.type`'s per-keystroke
   firing breaks a debounced/server-searched `Autocomplete` (fixed with a
   single `fireEvent.change`, matching `EncounterWorkspace.test.jsx`'s own
   already-established fix for the identical class of gap) — this applied
   to both the Patient autocomplete and, less obviously, a plain
   controlled numeric `<input type="number">` whose `onChange` re-clamps
   on every keystroke.

## Testing

Backend: `appointment-series.service.spec.ts` (12 tests — cross-org
rejection, patient self-scope rejection, per-occurrence reuse of
`AppointmentsService.create()`, partial-success report, idempotency-key
derivation, tenant+self-scope on `findOne`/`cancel`, org-scope on `list`);
2 new tests in `appointments.service.spec.ts` for the `seriesLink`
passthrough. Full backend unit suite: 2053/2055 (2 pre-existing, unrelated
`queue.service.spec.ts` failures — a date-boundary fixture that broke
independently of this slice when the wall-clock date rolled over,
confirmed via `git status` showing zero diff on either file and by
re-running in isolation). Full integration suite: 423/423, tenancy matrix
clean. `eslint`/`tsc --noEmit`: clean.

Frontend: 3 new tests in `pages/appointments/series/new.test.jsx` (render,
disabled-until-valid, full submit flow with a partial-success report
assertion). `eslint`: 0 errors (166 new I18N-1 warnings, well within the
4908 ratchet ceiling — documented, not silently introduced). Production
build + `npm run size`: all three budgets green. Full frontend unit suite:
326/337 passing across the touched/regression-relevant subset; 3
pre-existing unrelated failures (`manager/claims/index.test.jsx` — passed
on isolated re-run; `patient/Appointments.test.jsx` — fails even in full
isolation, confirmed unrelated via `git status`; `EncounterWorkspace.test.jsx`
— matches this session's own already-documented slow-jsdom-ProseMirror
flakiness pattern), none touching any file this slice modified.
