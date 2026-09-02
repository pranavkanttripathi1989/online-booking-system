---
id: PLAN250
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: REQ181
related: [TP270, TR270]
---

# PLAN250 — Implementation plan: IPD slice 3 (operation theatre scheduling)

Full design rationale for this slice lives in the approved plan file
(`/Users/pranavkanttripathi/.claude/plans/starry-soaring-bunny.md`) — this
document is the as-built record of what that plan became.

## Migration (hand-written, applied via `prisma migrate deploy`)

`20260902300000_ipd_ot_core` — `Drugs.item_type` (additive column,
default `'drug'`), `OperationTheatres`, `OtBookings` (+ both EXCLUDE
constraints + 1 CHECK), `OtBookingStaff`, `OtChecklists` (+
`@@unique([booking_id, phase])`), `OtNotes` (+ the reused
`reject_write_if_locked()` trigger from `20260902210000_ipd_nursing_
charting` — no new function definition), `OtConsumables`.

```sql
-- btree_gist already created in 20260902110000_ipd_adt_core;
-- IF NOT EXISTS makes this idempotent regardless of migration order.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "OtBookings" ADD CONSTRAINT "ot_bookings_no_theatre_overlap"
EXCLUDE USING gist (
  theatre_id WITH =,
  tsrange(start_at, end_at + (turnaround_minutes * INTERVAL '1 minute'), '[)') WITH &&
)
WHERE (is_cancelled = false);

ALTER TABLE "OtBookings" ADD CONSTRAINT "ot_bookings_no_surgeon_overlap"
EXCLUDE USING gist (
  primary_surgeon_clinician_id WITH =,
  tsrange(start_at, end_at, '[)') WITH &&
)
WHERE (is_cancelled = false);
```

`turnaround_minutes` is snapshotted onto the `OtBookings` row itself at
create time (from `OperationTheatres.default_turnaround_minutes`,
overridable per case) — the file-header comment in the migration explains
why: a GiST EXCLUDE constraint cannot join to another table, so the
"physically occupied" range must be computable from columns on the one row
the constraint protects.

Verified live via `psql \d+ "OtBookings"`: both EXCLUDE constraints, the
CHECK, and (via `pg_trigger`) the `ot_notes_lock_guard` trigger on
`OtNotes` all present exactly as declared.

## Backend layout

`backend/src/operation-theatre/` — `operation-theatres.service.ts`
(theatre CRUD, `assertTheatreInScope()`), `ot-bookings.service.ts`
(create/start/complete/cancel, staff assignment, the schedule-board query,
`assertSurgeonFree()`'s best-effort OPD-clash check), `ot-checklists
.service.ts` (phase completion via upsert, keyed on the row's own
`@@unique`), `ot-notes.service.ts` (create/update/sign, mirroring
`admissions/discharge-summary.service.ts`'s own lock-and-sign shape),
`ot-consumables.service.ts` (real stock consumption, `remove()` refuses to
delete a record that already wrote a `StockMovements` row — the audit
trail must survive), `ot-overlap.ts` (constraint-name matching, the
`wards/bed-overlap.ts` precedent), `operation-theatre.resolver.ts`,
`operation-theatre.module.ts`.

`Drugs.item_type` wiring: `drugs.service.ts#findAll` gained an optional
third `itemType` argument, defaulting to `'drug'` when the caller omits it
— every pre-existing call site (prescription builder's `DRUGS_QUERY`, MAR
order search) does exactly that, so this is additive with zero call-site
changes anywhere else in the codebase. `drugs.resolver.ts`'s new
`item_type` `@Args()` carries an explicit `type: () => String` (see the
real bug found below on why that matters even for a plain optional
string).

## A real bug found and fixed: reflection on the `Drugs.item_type` filter

None this slice, but the *pattern* that caused REQ180's own `@Args`
union-type bug was checked proactively before writing any new resolver
argument here — every new bare `@Args()` in `operation-theatre.resolver.ts`
carries an explicit `type:` even where a plain (non-optional-union)
TypeScript type would reflect correctly on its own, since the earlier
incident's root cause (a TS union like `string | undefined` in a function
parameter position, as opposed to a `?`-marked class property, cannot be
reflected via `emitDecoratorMetadata`) is easy to reintroduce by habit.

## Two tenancy-matrix gaps closed in the same pass

Adding this slice's own `matrix-coverage.int-spec.ts` classification
surfaced that `nursing` (REQ180) had never been classified at all — the
anti-rot gate (`technical-plans/00-foundation-hardening.md` §4) was
already silently red before this slice started. Confirmed live: running
`matrix-coverage.int-spec.ts` before any slice-3 classification work
failed with `unclassified: ["nursing", "operation-theatre"]`. `nursing`
is `EXEMPT` (every query keyed by `admission_id`/`ward_id`/`id`, not an
org-wide list, the `immunizations`/`patient-documents` precedent);
`operation-theatre` is a real `CASES` entry (`operationTheatres` is a
genuine org-wide list, the `wards` precedent) — new fixture rows
`IDS.theatreA`/`theatreB` added to `test/integration/setup/fixture.ts`.

## Frontend

`frontend/src/pages/ipd/OperationTheatre.jsx` — desktop-dense tier
(verified 1280/1440), page-local `gql`. Top-level nav entry (`/ipd/ot`,
`MeetingRoomIcon` reused from the existing Room Types/Rooms nav entries)
inside the same `RoleGuard` block as `/ipd/beds`/`/ipd/admissions`/
`/ipd/chart/:admissionId`, since this is a schedule board a coordinator
navigates to directly rather than a drill-down from another page. Booking
creation pulls its patient list from `admissions(filter: {clinic_id,
status: "admitted"})` (already-existing query, reused verbatim) rather
than a new query. Consumable recording reuses the exact drug-search +
stock-batch-picker pattern already established in
`pages/ipd/NursingChart.jsx`'s own MAR administration dialog.

## Verification

Backend: `npx tsc --noEmit` and `npx eslint "{src,apps,libs,test}/**/*.ts"`
clean throughout. Full unit suite 162 suites/2537 tests (up from
157/2478). Live schema introspection against the running container
confirmed all 6 new queries and 15 new mutations genuinely served on the
first container boot (no `UndefinedTypeError` this time — the lesson from
`REQ180` held). Integration: `ipd-ot.int-spec.ts` 6/6 gates pass; full
integration suite 11/11 suites, 488/488 tests (up from 439);
`matrix-coverage.int-spec.ts` green after closing both classification
gaps. Frontend: `eslint` clean of real findings (only the pre-existing,
accepted `I18N-1` warning class), `npm run build` and `npm run size`
green, 15/15 tests across the 4 IPD-domain frontend suites (including a
new, retroactive `NursingChart.test.jsx` closing a real slice-2 gap found
while writing this slice's own tests).
