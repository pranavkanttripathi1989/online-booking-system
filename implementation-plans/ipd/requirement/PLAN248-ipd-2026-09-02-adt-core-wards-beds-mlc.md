---
id: PLAN248
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: REQ179
related: [TP268, TR268]
---

# PLAN248 — Implementation plan: IPD slice 1 (ADT core)

Full design rationale, the five highest-risk decisions, and the four-more
slices this is the foundation for are recorded in the approved plan file
(`/Users/pranavkanttripathi/.claude/plans/starry-soaring-bunny.md` at the
time of writing) — this document is the as-built record of what that plan
became.

## Migrations (both hand-written, applied via `prisma migrate deploy`)

`20260902100000_notification_events_ipd_core` — four new
`NotificationEventType` enum values, alone, applied before any code
referenced them (the documented `break_glass_requested`/`low_stock_alert`
precedent: a missing value makes Prisma reject the whole `dispatch()` call
and fail the caller's mutation). `ALTER TYPE ... ADD VALUE` cannot run in
the same transaction that later uses the value, which is the other reason
this is its own file.

`20260902110000_ipd_adt_core` — `Wards`, `Beds`, `Admissions`,
`BedOccupancies`, `AdmissionEvents`, `MlcRegisters`, `MlcAmendments`,
`IpdBillingSettings`, all FKs.

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "BedOccupancies" ADD CONSTRAINT "bed_occupancies_no_double_occupancy"
EXCLUDE USING gist (
  bed_id WITH =,
  tsrange(start_at, end_at, '[)') WITH &&
)
WHERE (is_cancelled = false);
```

Two `CHECK` constraints on `BedOccupancies`: `occupancy_kind='occupied'`
implies `admission_id IS NOT NULL` (and vice versa), and `end_at`, when
present, is after `start_at`.

MLC immutability, modelled directly on `reject_write_if_encounter_locked()`
(`20260824010000_clinical_records_encounters`): `BEFORE UPDATE OR DELETE`
triggers on `MlcRegisters` (one carve-out — the police-intimation block may
go from `NULL` to a value exactly once) and `MlcAmendments` (fully
append-only, no carve-out).

## Schema — field lists

```prisma
model Wards {
  id, client_org_id, clinic_id, name, ward_type (default "general"),
  floor?, gender_policy (default "mixed"),
  bed_charge_product_id?, nursing_charge_product_id?,
  is_active, is_deleted, created_at, updated_at
}
model Beds {
  id, client_org_id, clinic_id, ward_id, bed_number, bed_type?,
  bed_charge_product_id?, status (default "available"),
  is_active, is_deleted, created_at, updated_at
  @@unique([ward_id, bed_number])
}
model Admissions {
  id, client_org_id, clinic_id, patient_id, admission_number (@unique),
  status (default "pending"), admission_type (default "general"),
  admitted_at, expected_discharge_at?, discharge_initiated_at?,
  discharged_at?, discharge_type?,
  admitting_clinician_id, attending_clinician_id, department_id?,
  source_appointment_id?, source_encounter_id?,
  provisional_diagnosis, final_diagnosis?, admission_notes,
  billing_mode (default "itemized"), ipd_package_id?, payer_id?, policy_id?,
  is_mlc, is_critical, created_by_user_id, is_deleted, created_at, updated_at
}
model BedOccupancies {
  id, client_org_id, clinic_id, bed_id, ward_id, admission_id?,
  occupancy_kind (default "occupied"), start_at, end_at?, end_reason?,
  reason?, is_cancelled, created_by_user_id, ended_by_user_id?, created_at
}
model AdmissionEvents {
  id, admission_id, client_org_id, event_type, occurred_at,
  payload_json?, notes?, actor_user_id, created_at
}
model MlcRegisters {
  id, client_org_id, clinic_id, admission_id (@unique), mlc_number (@unique),
  mlc_category, incident_datetime?, incident_place?, brought_by_*  (4 fields),
  identification_mark_1, identification_mark_2, injury_details,
  police_station?, police_intimated_at?, police_intimated_by_user_id?,
  receiving_officer_name?, receiving_officer_buckle_no?, intimation_mode?,
  examined_by_clinician_id, recorded_by_user_id, recorded_at, created_at
  -- NO is_deleted, NO updated_at: immutable by design
}
model MlcAmendments {
  id, mlc_register_id, field_name, previous_value, corrected_value, reason,
  amended_by_user_id, amended_at
}
model IpdBillingSettings {
  id, client_org_id, clinic_id (@unique), day_boundary_mode, discharge_cutoff_hour,
  charge_admission_day, charge_discharge_day, minimum_billable_days,
  transfer_day_rate_policy, package_excess_policy, default_deposit_paise,
  auto_post_room_charges, created_at, updated_at
  -- table only, unwired -- slice 4 wires it
}
```

Scoping map: every model above owns `client_org_id` directly except
`MlcAmendments` (scopes via `mlc_register.client_org_id`) — the rule
applied throughout is "a model queried directly by a board/list query owns
`client_org_id`; a pure child collection scopes via its parent relation."

## `AdmissionsService` — the ADT operations

Every operation is one `$transaction`. **Admit**: validates clinic/bed/
patient/clinician all in scope and the bed in the same clinic, rejects a
patient with an existing live admission (`pending|admitted|
discharge_initiated`), numbers the admission inside the transaction (so a
rejected admission never burns a number), creates the `Admissions` row,
the `BedOccupancies` row, sets `Beds.status='occupied'`, logs an
`admitted` event. **Transfer**: closes the source occupancy *before*
inserting the destination one — so the insert is the only statement the
exclusion constraint can reject — source bed → `cleaning`, destination →
`occupied`. **Discharge**: closes the occupancy with `end_reason:
'discharge'`, bed → `cleaning` (not `available` — housekeeping releases it
explicitly), admission → `discharged`. **Cancel**: the occupancy is
`is_cancelled: true`, not merely closed, so the exclusion constraint's own
`WHERE` predicate excludes it and the bed is genuinely free for the same
period afterward, retroactively.

## The `23P01` bug, found by the integration spec

Postgres reports an exclusion violation as SQLSTATE `23P01`. Prisma does
**not** map this to one of its own error codes — it surfaces as a
`PrismaClientUnknownRequestError` carrying the raw driver text in
`.message`. The first implementation checked `err.code === '23P01'`, which
silently never matches; the constraint fired correctly and the caller
still received a raw Postgres dump. Fixed by matching on the constraint
name in the message text instead (`bed_occupancies_no_double_occupancy`),
exactly the pattern `appointments.service.ts` already uses for its own
three overlap constraints. The helper (`isBedOverlapViolation`) lives in
`wards/bed-overlap.ts` rather than `admissions/`, so the module dependency
runs the same direction as `AdmissionsModule` importing `WardsModule`,
never the reverse.

## `MlcService`

`record()` rejects an admission that already has a register (one MLC per
admission, `@unique`), validates the examining clinician is in scope,
numbers the register, creates it, sets the denormalised `Admissions.is_mlc`
flag, logs an `mlc_flagged` event. `recordPoliceIntimation()` rejects if
already recorded — the trigger's own carve-out is exactly once, and this
is the readable error in front of it. `amend()` reads `previous_value`
from the row itself, never accepts it as a caller-supplied value, and only
allows a fixed, reviewed set of statutory fields (never `mlc_number` or
`admission_id`).

## Sweeps

`MlcPoliceIntimationSweepService` (`@Cron('0 * * * *')`): warns at 20h
elapsed, 4h ahead of the real 24h deadline; per-recipient once-per-day
dedup via a title+today lookup against `Notifications` (the
`low-stock-sweep.service.ts` precedent — this codebase's `Notifications`
model has no `event_type` column to key on directly).
`BedStatusReconcileService` (`@Cron('0 3 * * *')`): re-derives every bed's
`status` from its live `BedOccupancies` row and corrects a divergence,
logging it loudly. `cleaning` with no open occupancy row is not flagged —
it is set directly by discharge/transfer with no timeline row of its own
until housekeeping explicitly blocks or releases the bed.

## Frontend

`pages/ipd/BedBoard.jsx`: `useQuery` with `pollInterval: 10_000` (Apollo's
own polling, not a hand-rolled interval), grouped by ward, a local
`bedStatusStyle()` helper (`alpha(theme.palette.X.main, ...)` per status —
bed status has no place in `theme.palette.appointmentStatus`, matching
UI-8's own documented fallback pattern for exactly this case). Clicking an
available bed routes to `/ipd/admissions?bed=<id>`; clicking an occupied
one routes to `?open=<admissionId>`.

`pages/ipd/Admissions.jsx`: list with clinic/status filters; New Admission
dialog (debounced patient `Autocomplete` reusing `PlatformBilling.jsx`'s
own fixed `reason: 'reset'` bug pattern verbatim, ward→bed cascade);
detail dialog with three tabs (bed history, ADT timeline, MLC) and
transfer/discharge/cancel/MLC-filing actions. `?bed=`/`?open=` query
params read via `useSearchParams` to support arriving from the bed board.

Routes share the `/queue` module's own dedicated `RoleGuard` block
(`staff|clinician|manager|admin|super_admin`), matching the backend read
gate exactly rather than the narrower admin/manager-only block used
elsewhere. `admin/Plans.jsx`'s `FEATURE_FLAG_KEYS` gained `ipd`.

## Testing

Backend: 92 tests total — `wards.service.spec.ts` (19), `bed-board.service
.spec.ts` (4), `admissions.service.spec.ts` (23), `mlc.service.spec.ts`
(15), `mlc-police-intimation-sweep.service.spec.ts` (6), `bed-status-
reconcile.service.spec.ts` (6), plus `ipd-adt.int-spec.ts` (5 integration
gates: concurrent-admission race, backdated-transfer rejection,
cancel-then-reuse, MLC-immutability-attacked-directly, bed-board
cross-tenant isolation). Frontend: `BedBoard.test.jsx` (4), `Admissions
.test.jsx` (6, including the full New Admission flow end to end and the
MLC police-intimation-overdue warning).

## Live verification

Full backend suite (152 suites/2421 tests), integration suite (all IPD
gates plus the full existing tenancy matrix, both new domains as real
`CASES` entries), `tsc`/`eslint` clean. Frontend `eslint`/`build`/
`size-limit` all green, ratchet not increased (3597/4908). Live schema
introspection against the running `medibook_backend` container (after
`docker exec ... npx prisma generate` + restart) confirmed all 9 new
queries and 16 new mutations are genuinely served — no silent
module-recompile race. See `TR268` for the full field list.
