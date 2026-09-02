---
id: REQ181
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: REQ179
related: [REQ180]
---

# In-patient department (IPD) slice 3: operation theatre scheduling

## Source

Continuation of the approved, `ExitPlanMode`-confirmed 5-slice IPD plan
(`REQ179`'s own source note) — slice 3 of 5. Driven by a bare `continue`
after slice 2 (REQ180) shipped, tested, documented, and was pushed, per the
working loop's own resumption protocol.

## What this ships

- **`OperationTheatres`/`OtBookings`** — theatre master data plus the
  booking itself, the OT aggregate root for one procedure inside one
  admission. Two Postgres GiST `EXCLUDE` constraints are the real
  guarantee, the identical design axiom as slice 1's bed-occupancy
  constraint (the database enforces mutual exclusion, never application
  code, since an availability check and an insert are two statements):
  - **Theatre-overlap**, with turnaround **folded directly into the
    excluded range** rather than padded in application code —
    `turnaround_minutes` is snapshotted onto the `OtBookings` row itself
    from the theatre's own default at booking time (overridable per case),
    because a GiST EXCLUDE constraint cannot join to another table.
  - **Surgeon-overlap**, deliberately excluding turnaround (theatre
    cleaning time is not a constraint on a surgeon's own calendar).
- **`OtBookingStaff`** — the team beyond the primary surgeon/anesthetist
  (both denormalised onto `OtBookings` for the exclusion constraint's own
  sake), keyed by user, not clinician — scrub/circulating nurses are staff
  accounts, not necessarily `Clinicians` rows.
- **`OtChecklists`** — the WHO Surgical Safety Checklist, exactly 3 phases
  (`sign_in`/`time_out`/`sign_out`), `@@unique([booking_id, phase])`.
  `completeOtBooking` is rejected until all 3 are complete.
- **`OtNotes`** — the operative note, one per booking, locked and
  content-immutable via the exact `reject_write_if_locked()` trigger
  `AdmissionNotes`/`DischargeSummaries` already use (REQ180) — no new
  trigger definition needed.
- **`OtConsumables`** — real stock consumption for consumables, implants
  (`implant_serial_no` for traceability) and surgical items, mirroring
  `mar.service.ts#consumeStock`'s exact transaction shape (itself
  replicating `pharmacy.service.ts#dispensePrescriptionItem`): decrement
  `DrugBatches.quantity_remaining`, write an append-only `StockMovements`
  row. `charge_id` stays null this slice — nothing bills for OT
  consumption until slice 4 backfills it, a stated gap, not an oversight.
- **`Drugs.item_type`** (`drug|consumable|implant|surgical_item|oxygen`),
  defaulting to `'drug'` so every existing drug picker (prescription
  builder, MAR order search) keeps working with zero call-site changes —
  none of them pass this filter, so the default alone is what keeps
  gauze/implants out of a prescription autocomplete.
- **Best-effort cross-domain clash detection** — `assertSurgeonFree()`
  checks a surgeon's real OPD `Appointments` against the requested OT slot
  at create time. **Stated limitation, not an oversight**: Postgres has no
  cross-table `EXCLUDE` constraint, so a subsequent OPD booking made
  *after* this OT slot exists is not caught — the identical, already-
  documented gap this codebase's own session-mode capacity check has.
- **Frontend** — `pages/ipd/OperationTheatre.jsx`, desktop-dense tier, a
  top-level nav entry (a schedule board, not a drill-down like the nursing
  chart) with theatre management, booking creation off a live-admission
  picker, and a detail dialog driving the full lifecycle (start/complete/
  cancel, WHO checklist, operative note, consumables with real stock-batch
  selection).

## Reuse decisions (do not rebuild)

- `reject_write_if_locked()` (REQ180) applied to `OtNotes` — no new
  trigger.
- `mar.service.ts#consumeStock`'s exact transaction shape, replicated (not
  called — it is scoped to `MedicationAdministrations`, not
  `OtConsumables`).
- Tenant scoping via `assertSameOrg`/`isSameOrg`/`orgScope` throughout, a
  per-service `assertBookingInScope()`/`assertTheatreInScope()` helper
  matching this codebase's own established convention of small per-service
  scope guards.
- `isTheatreOverlapViolation()`/`isSurgeonOverlapViolation()`
  (`operation-theatre/ot-overlap.ts`) match `wards/bed-overlap.ts`'s own
  constraint-name-string-matching pattern (Prisma does not map Postgres's
  exclusion-violation SQLSTATE `23P01` to its own error codes).

## Deliberately NOT built in this slice (recorded, not silently dropped)

- OT billing (room/theatre charges, consumable charges) — slice 4. No
  bill exists for OT usage in this slice at all.
- Equipment/ancillary booking alongside a theatre slot, prep/recovery room
  booking (modelled as theatre turnaround, per the original plan's own cut)
  — out of scope.
- Notification integration (a booking-scheduled/cancelled alert) — no
  acceptance criterion required it this slice; deliberately not added to
  keep scope additive and isolated.
- A `discardOtBooking`-style hard delete — cancellation is the only
  terminal-before-completion path, matching every other IPD domain's own
  soft-terminal convention.

## Acceptance criteria

**US-IPD-09**: As an OT coordinator, I can book a theatre for a procedure,
and the database itself prevents two bookings physically colliding.
- Given 5 concurrent booking requests for the same theatre and overlapping
  times, when submitted, then exactly one succeeds and the other four
  receive a clean conflict message, never a raw database error or a 500.
  Live-proven under real concurrency.
- Given a booking ending at time T with a 30-minute turnaround, when a
  second booking is requested starting exactly at T, then it is rejected
  — the turnaround has not yet elapsed. A booking starting after T plus
  the turnaround succeeds.
- Given the same surgeon booked into theatre A for a time window, when a
  second booking for that same surgeon is requested in theatre B for an
  overlapping window, then it is rejected — a guarantee the theatre-only
  constraint alone cannot provide.

**US-IPD-10**: As theatre staff, I cannot mark a case complete until the
WHO Surgical Safety Checklist is fully done.
- Given an in-progress booking with 0, 1, or 2 of the 3 checklist phases
  complete, when `completeOtBooking` is called, then it is rejected,
  naming the missing phase(s).
- Given all 3 phases complete, then `completeOtBooking` succeeds.

**US-IPD-11**: As a surgeon, I can write and sign an operative note, and
once signed it cannot be silently altered.
- Given a signed operative note, when a direct database `UPDATE` is
  attempted (bypassing every service-layer check), then it is rejected by
  the database trigger itself.

**US-IPD-12**: As theatre staff, I can record a consumable or implant used
during a procedure, and when linked to a real stock batch it decrements
genuine inventory.
- Given a consumable recorded against a batch, when saved, then
  `DrugBatches.quantity_remaining` decrements by the recorded quantity and
  an append-only `StockMovements` row exists.
- Given an existing drug picker anywhere else in the app (prescriptions,
  MAR), when it queries drugs with no `item_type` argument, then it never
  sees a consumable/implant/surgical item — the new column's default alone
  guarantees this with zero code change at any pre-existing call site.

## Data model impact

New: `OperationTheatres`, `OtBookings` (+ 2 GiST `EXCLUDE` constraints + 1
`CHECK`), `OtBookingStaff`, `OtChecklists` (+ `@@unique([booking_id,
phase])`), `OtNotes` (+ the reused lock trigger), `OtConsumables`. Altered:
`Drugs` gained `item_type` (default `'drug'`). See `PLAN250` for full field
lists and the migration SQL.

## Verification

Backend: 57 new unit tests across 5 spec files plus 2 new
`drugs.service.spec.ts` cases for the `item_type` default. Full suite: 162
suites/2537 tests (up from 157/2478). Integration: a dedicated
`ipd-ot.int-spec.ts` proving both exclusion constraints under real
concurrency (5 concurrent bookings into one theatre, the exact turnaround
boundary, cross-theatre surgeon overlap) and the `OtNotes` lock trigger by
attacking the table directly — 6/6 gates pass. Full integration suite:
11/11 suites, 488/488 tests (up from 439). Also closed two tenancy-matrix
classification gaps found while adding this slice's own entry: `nursing`
(a pre-existing miss from `REQ180`, now `EXEMPT` with a stated reason) and
`operation-theatre` itself (a real `CASES` entry, the `wards` precedent).
`tsc`/`eslint` clean throughout. Live schema introspection confirmed all 6
new queries and 15 new mutations are genuinely served. Frontend: build/
lint/size-limit green (`OperationTheatre`'s own lazy chunk 6.55kB
gzipped), 15/15 IPD-domain frontend tests passing including a retroactive
`NursingChart.test.jsx` (slice 2 had shipped without one). See `TR270` for
full detail.
