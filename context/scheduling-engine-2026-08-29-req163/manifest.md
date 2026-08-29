---
id: CTX-scheduling-engine-2026-08-29-req163
type: improvement
feature: scheduling-engine
created: 2026-08-29
updated: 2026-08-29
status: done
parent: REQ017
related: [REQ163, PLAN222, TP242, TR242]
---

# Recurring/series appointments + treatment-plan scheduling (P2-10, 2026-08-29)

Picked up via bare `continue` per `project-plans/phase-plans/README.md`'s
`▶ CURRENT POSITION` block, which named `P2-10` as the next unstarted,
unblocked slice in `02-phase2-win-the-midmarket.md`. Before designing
anything, three parallel Explore agents researched the real backend
appointment-creation internals, the real frontend booking wizards, and
this codebase's own existing (mostly dead) recurrence conventions — all
findings confirmed the slice's own premise: nothing today lets a caller
create more than one linked appointment in one action, and the closest
existing "recurrence" concept (`ClinicianAvailability`'s own
`recurrence_type`/`recurrence_days`) is functionally dead beyond
day-of-week matching, not a working precedent to extend.

## Design

One backend concept, `AppointmentSeries` — covers both a simple recurring
series (same service, N times) and a heterogeneous treatment plan
(different services over time) as the same shape: a named,
eagerly-materialized group of real `Appointments` rows. The core design
decision: **reuse `AppointmentsService.create()` per occurrence, never
reimplement its validation** — tenant scoping, patient self-scope,
intake fields, prepayment/no-show-risk policy, slot-vs-session-mode
conflict checking, and idempotency-key/EXCLUDE-constraint handling all
come along unmodified, since there's no working recurrence-expansion
precedent to build on and no batch-level relaxation of the underlying
Postgres EXCLUDE constraints. Each occurrence gets its own try/catch
(matching `bulkReschedule()`'s established partial-success pattern) —
one occurrence's genuine slot conflict never rolls back the others.

## What shipped

- Backend: new `AppointmentSeries` model + migration; new
  `backend/src/appointment-series/` module (scaffolded like `packages/`);
  `AppointmentsService.create()` gained an internal-only 3rd parameter
  (`seriesLink`) — deliberately never a client-settable DTO field;
  tenancy-matrix registration.
- Frontend: `pages/appointments/series/{new,detail}.jsx` (new, separate
  pages rather than retrofitting either existing booking wizard); 2 new
  routes; a "New Series" discovery button; a "Part of series" badge on
  the appointments list and detail pages.

## Real findings during implementation

1. A Prisma schema-vs-migration drift risk caught before applying: the
   first schema draft omitted the `client_organization` relation field
   Prisma needs to match the migration's own hand-written FK — fixed by
   matching `RevenueShareRules`' own precedent.
2. The host and the Docker container maintain **separate** generated
   Prisma Clients — `docker exec ... prisma generate` doesn't regenerate
   the host's copy, which `npm run test:int` (run from the host per
   CLAUDE.md's own convention) still needs regenerated separately.
3. A genuine MUI-Autocomplete-plus-Apollo-mock gotcha: `MockedProvider`'s
   `addTypename={false}` only controls the *outgoing* query, not whether a
   mock's own *response* data needs `__typename` on every nested object —
   without it, `InMemoryCache` silently drops every field to `{}` on read.
   `pages/patients/detail.test.jsx` had already discovered and worked
   around this; matched its convention.
4. **The most significant finding, live-only** (not caught by any mocked
   unit test): services are org-level masters (`clinic_id: null`, per
   REQ055) — a clinic-scoped `SERVICES_QUERY` legitimately returns zero
   rows for a clinic with real, active, bookable services. The existing
   `BookingWizard`'s own Step 2 never hits this because it derives
   available services from the **selected clinician's own `services`
   relation** instead. Fixed by matching that exact pattern rather than
   inventing a new one. Also found and fixed, same live pass: the default
   `CLINICIANS_QUERY` page size (`first: 20`) let accumulated E2E-test
   clinician rows push a real clinician off page 1 — fixed to `first:
   100`, matching `appointments/{index,edit}.jsx`'s own established
   precedent for this exact situation.

## Documents

- `requirements/scheduling-engine/improvement/REQ163-*.md` (done)
- `implementation-plans/scheduling-engine/improvement/PLAN222-*.md`
- `test-plans/scheduling-engine/improvement/TP242-*.md`
- `test-results/scheduling-engine/improvement/TR242-*.md`

## Verification

Backend: 121/121 new+extended unit tests; full unit suite 2053/2055 (2
pre-existing unrelated `queue.service.spec.ts` failures, confirmed via
`git status`); full integration suite 423/423, tenancy matrix clean;
`eslint`/`tsc --noEmit` clean. Frontend: 3/3 new tests; `eslint` 0 errors;
build + size budgets green. **Live-verified end-to-end against the real
dev stack and real Postgres**, as `manager@medibook.dev` on "City Heart
Clinic Group": created a real 4-occurrence weekly series (confirmed via
direct `psql`), confirmed the real EXCLUDE constraint rejects a duplicate
resubmission with a correct partial-failure report, viewed the series
detail page, cross-navigated via the "Part of series" badge, and cancelled
the remaining occurrences (confirmed via direct `psql` that all 4
`Appointments` rows and the `AppointmentSeries` row itself moved to
`cancelled`).

## Not done this pass, stated not hidden

- Patient-portal access to the series pages (backend already supports and
  self-scopes a `'patient'` caller correctly; the new frontend routes sit
  under the staff-only `RoleGuard` block for now).
- A "part of series" badge on `calendar/index.jsx`'s event popover —
  deliberately held back since a separate, concurrent user request was
  already scoped against that same file (the clinician calendar popover's
  consultation-launch UX).
- Per-occurrence clinician override in the Treatment Plan UI (the backend
  DTO already supports it; the UI doesn't yet expose it).
- No per-occurrence cancellation-fee enforcement, no lazy/on-demand
  occurrence generation, no stored `'completed'` series status — all
  matching `REQ163`'s own stated scope cuts.
