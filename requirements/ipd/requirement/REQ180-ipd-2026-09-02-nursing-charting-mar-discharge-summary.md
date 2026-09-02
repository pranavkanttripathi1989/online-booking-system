---
id: REQ180
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: REQ179
related: []
---

# In-patient department (IPD) slice 2: nursing charting, medication orders, MAR, discharge summary

## Source

Continuation of the approved, `ExitPlanMode`-confirmed 5-slice IPD plan
(`REQ179`'s own source note) — "core first, then layers", slice 2 of 5.
Driven by a bare `continue`/`push and continue` from the user after slice 1
(REQ179) shipped, tested, and was pushed, per the working loop's own
resumption protocol.

## What this ships

- **`Vitals` extended, not forked** — `encounter_id` made nullable,
  `admission_id`/`shift` added, `CHECK vitals_exactly_one_parent` (exactly
  one of the two parents, never both, never neither). A BP trend is one
  series across a patient's OPD follow-ups and their IPD stay, which is the
  entire clinical point of a trend. Audited every `encounter_id` call site
  before the migration (`encounters.service.ts#patientVitals` widened to an
  OR across both parents); zero other code assumed non-null.
- **Standing medication orders and MAR** — `IpdMedicationOrders` (dose,
  route, frequency, explicit `schedule_times`, PRN, high-alert flag) is
  deliberately **not** `Prescriptions` (a take-home script), since an IPD
  order stands for days with its own stop date. `MedicationAdministrations`
  is the MAR; a 30-minute `MarScheduleSweepService` materialises scheduled
  rows ahead of time, made freely re-runnable by the row's own
  `@@unique([order_id, scheduled_at])`. Administering a `given` dose that
  names a stock batch writes real `DrugBatches`/`StockMovements` rows,
  mirroring `pharmacy.service.ts#dispensePrescriptionItem`'s own transaction
  shape (`reference_type: 'medication_administration'`, not
  `'prescription_item'`, since no `PrescriptionItems` row exists here). A
  high-alert order cannot be marked `given` without a `witness_user_id` —
  enforced in the service, since a schema-level requirement can't express
  "conditional on a sibling row's own flag".
- **Intake / output** — `IntakeOutputRecords`, direction-specific category
  lists validated server-side. The running balance is derived at read time
  from the ledger, never a maintained total that can drift.
- **Admission notes** — one `AdmissionNotes` table with a `note_kind`
  discriminator (nursing vs. doctor-round SOAP vs. incident, etc.) —
  separate in the UI per the market research, not in storage. Per-note
  lock via `reject_write_if_locked()`, a new reusable trigger function
  (simpler than `reject_write_if_encounter_locked()` since `locked` lives
  on the same row). Addenda are append-only via a genuinely separate
  `AdmissionNoteAddenda` table (a deviation from the original plan sketch's
  assumed self-relation, found correct during exploration before schema
  was written), allowed regardless of lock state — mirrors
  `EncounterAddenda`.
- **Shift handover (SBAR)** — `ShiftHandovers`, one row per handover with an
  optional named recipient and acknowledgement timestamp.
- **Discharge summaries** — `DischargeSummaryTemplates` (org/clinic-scoped
  section lists) + `DischargeSummaries`. "Template-based" is real: the
  free-text sections are pre-filled server-side at create time from the
  admission's own `AdmissionEvents` timeline and active medication list,
  not a blank form. Locked and SHA-256-content-hashed at sign time exactly
  like `Prescriptions.pdf_hash` (a deviation from the original plan
  sketch's `pdf_ref`/`pdf_sha256` guess — this codebase has no file-storage
  precedent anywhere, only the content-hash-at-sign-time one).
- **Frontend** — `pages/ipd/NursingChart.jsx`, tablet-first tier, six tabs
  against the six domains above, reached via a "Chart" action on the
  admissions detail dialog for a live admission (not top-level nav, matching
  how transfer/discharge already surface only from that same flow).

## Reuse decisions (do not rebuild)

- `pharmacy.service.ts#dispensePrescriptionItem`'s exact stock-consumption
  transaction shape, replicated (not called — it hardcodes a different
  `reference_type` and requires a `PrescriptionItems` row that doesn't
  exist here).
- `EncounterAddenda`'s append-only-by-construction pattern for
  `AdmissionNoteAddenda`.
- `Prescriptions.pdf_hash`'s content-hash-at-sign-time pattern for
  `DischargeSummaries.pdf_hash`.
- Tenant scoping via `assertSameOrg`/`isSameOrg` throughout, a per-service
  `assertAdmissionInScope()` helper matching this codebase's own
  established convention of small per-service scope guards rather than one
  shared cross-module helper.

## Deliberately NOT built in this slice (recorded, not silently dropped)

- ICU ventilator/infusion flowsheets — out of scope per the user's own
  confirmed "standard ward charting" decision at plan time.
- Discharge-summary PDF rendering — the content-hash-at-sign-time design is
  in place (the hard part); wiring a `documents.service.ts` PDF export is
  additive future work, not blocking this slice's own acceptance criteria.
- A discharge-summary addendum path for a correction after signing — no
  such table exists yet; a signed summary can only be corrected by a future
  slice, matching this codebase's "record the gap, don't silently guess"
  convention.
- Operation theatre, IPD billing, TPA cashless insurance — slices 3-5.

## Acceptance criteria

**US-IPD-05**: As a nurse, I can chart vitals against an admission and see
them alongside the same patient's OPD history.
- Given an admission, when I record a set of vitals, then `unit` is
  server-derived from the code, never client-supplied, and the reading
  appears in the same growth-chart query used for OPD encounters.

**US-IPD-06**: As a nurse, I can administer a scheduled medication dose and
the system enforces real safety controls.
- Given a high-alert order's scheduled dose, when I mark it `given` with no
  witness, then the mutation is rejected.
- Given a dose marked `given` against a real stock batch, when recorded,
  then `DrugBatches.quantity_remaining` decrements and a `StockMovements`
  row exists — the dose is real stock, not notional.
- Given the MAR sweep runs three times against the same active order, then
  it produces zero duplicate scheduled rows.

**US-IPD-07**: As a doctor or nurse, I can write an admission note, sign it,
and later add an addendum without altering the original.
- Given a signed note, when I attempt to edit it directly, then the
  database trigger rejects the write even if the service layer is
  bypassed.
- Given a signed note, when I add an addendum, then it succeeds regardless
  of the note's lock state.

**US-IPD-08**: As ward staff, I can create a discharge summary that starts
pre-filled from the real admission timeline, then sign it.
- Given an admission with prior events and active orders, when I create its
  discharge summary, then `course_in_hospital` and `discharge_medications`
  are pre-filled from those real rows, not blank.
- Given a signed discharge summary, when I request its content hash twice
  with unchanged content, then both hashes match; when content differs,
  the hashes differ.

## Data model impact

`Vitals` altered (nullable `encounter_id`, `admission_id`, `shift`,
`vitals_exactly_one_parent` CHECK). New: `IpdMedicationOrders`,
`MedicationAdministrations` (+ `@@unique([order_id, scheduled_at])`),
`IntakeOutputRecords`, `AdmissionNotes` (+ `reject_write_if_locked()`
trigger), `AdmissionNoteAddenda`, `ShiftHandovers`,
`DischargeSummaryTemplates`, `DischargeSummaries` (+ the same lock trigger).
See `PLAN249` for full field lists and migration SQL.

## Verification

Backend: 57 new unit tests across 5 spec files (`nursing.service.spec.ts`,
`medication-orders.service.spec.ts`, `mar.service.spec.ts`,
`mar-schedule-sweep.service.spec.ts`, `discharge-summary.service.spec.ts`)
plus one expected regression-test update in `encounters.service.spec.ts`
for the widened `patientVitals()` query shape. Full suite: 157
suites/2478 tests. `tsc --noEmit`/`eslint` clean. Live schema introspection
against the running container confirmed all 11 new queries and 17 new
mutations are actually served (caught and fixed a real
`UndefinedTypeError` from four GraphQL `@Args` declared with a
TypeScript union type (`string | undefined`) and no explicit `type:` —
a union can't be reflected via `design:type`, so NestJS/graphql has
nothing to infer the GraphQL type from). Frontend: build/lint/size-limit
green, `NursingChart.jsx`'s own lazy chunk 9.35kB gzipped. See `TR269` for
full detail.
