---
id: TP242
type: improvement
feature: scheduling-engine
created: 2026-08-29
updated: 2026-08-29
status: approved
parent: PLAN222
related: [TR242]
---

# TP242 — Recurring/series appointments + treatment-plan scheduling verification

## Backend unit tests

1. `appointment-series.service.spec.ts` (new, 12 cases):
   - `create()` rejects a cross-org clinic and a patient booking for
     someone other than themselves/a dependant, both before the series
     row is ever created.
   - `create()` calls the existing `AppointmentsService.create()` once
     per occurrence, passing the series link — proves reuse, not
     reimplementation, of tenant scope/self-scope/intake/prepayment/
     conflict logic.
   - A genuine per-occurrence failure (a simulated slot conflict) does
     not abort the others — partial-success report shape asserted
     exactly (`attempted_count`/`created_count`/`failed_count`/`failures`).
   - The outer `idempotency_key` is derived into a distinct,
     deterministic per-occurrence key (`` `${key}:occ:${i}` ``) for each
     inner `create()` call.
   - `findOne()` rejects a cross-org caller and a patient who isn't the
     series' own patient/a dependant; returns the real occurrences
     (via `AppointmentsService.findBySeriesId()`) for an in-scope caller.
   - `cancel()` cancels only non-terminal occurrences (a completed one
     stays untouched), tolerates a per-row cancel failure without
     aborting the rest, rejects a cross-org caller, and sets the series'
     own `status` to `'cancelled'`.
   - `list()` org-scopes via the clinic relation.
2. `appointments.service.spec.ts` — extended: the new `seriesLink` 3rd
   parameter persists `series_id`/`series_occurrence_no` when passed, and
   leaves both `undefined` for every ordinary (non-series) booking.

## Backend integration

- New tenancy-matrix `CASES` row for `appointment-series`
  (`appointmentSeriesList`, org-scoped) — `test/integration/tenancy.int-spec.ts`
  auto-generates the standard cross-tenant-rejection/role-gating
  assertions from it; `matrix-coverage.int-spec.ts` must not fail on an
  unclassified `appointment-series` domain.
- Full integration suite must stay green (423/423 baseline before this
  slice) — proves the new module doesn't destabilize any other domain's
  real-Postgres/real-HTTP path.

## Frontend unit tests

`pages/appointments/series/new.test.jsx` (new):
1. Renders the series-creation form (name field, Recurring/Treatment Plan
   toggle both present).
2. "Create Series" stays disabled until name + patient + clinic +
   clinician + at least 2 occurrences are all present.
3. A full Recurring-mode submission: fills every field, generates 2
   occurrences, submits, and asserts (a) the mutation's `input.occurrences`
   array has exactly 2 entries with the right `service_id`, (b)
   `series_type: 'recurring'`, (c) the partial-success report renders
   correctly for a mixed created/failed response (1 of 2 scheduled, with
   the specific failure reason shown) — never a silent "some succeeded".

## Static checks

- `npx eslint`/`npx tsc --noEmit` (backend): 0 errors.
- `npx eslint` (frontend, every touched file): 0 errors; new I18N-1
  warnings stay within the tracked `--max-warnings` ratchet ceiling.
- `npm run build` + `npm run size` (frontend): production build succeeds;
  all three tracked bundle budgets stay green (both new pages are
  lazy-loaded route chunks, not part of the initial bundle).

## Live verification (Chrome DevTools MCP, real dev stack)

As `manager@medibook.dev`:
1. Create a real "Recurring" series (4 weekly GP Consultation
   occurrences) for a real patient/clinician with genuine availability;
   confirm 4 real rows appear in `/appointments` and `/calendar`, each
   showing the "Part of series" indicator.
2. Deliberately create a series where one occurrence's slot is already
   booked; confirm the partial-success report shows the correct
   created/failed counts with a real, specific failure reason per failed
   occurrence — not a generic error.
3. Open the series detail page from the badge/link; confirm every real
   occurrence and its live status is listed.
4. Cancel the series; confirm the remaining non-terminal occurrences move
   to `cancelled` while any already-completed occurrence is untouched,
   and the series itself shows as cancelled.
