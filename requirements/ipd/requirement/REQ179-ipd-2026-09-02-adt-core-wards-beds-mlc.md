---
id: REQ179
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: null
related: []
---

# In-patient department (IPD) slice 1: admissions, wards, beds, live bed board, medico-legal register

## Source

Direct user request: integrate nursing home / hospital / ICU / private ward /
normal ward / operation theatre, "all services operations, and billing" as a
**complete system**. Preceded by real competitor research (Insta HMS/Practo,
MocDoc) and a full audit of this codebase's own existing building blocks,
both dispatched as research forks before any design work. Scope confirmed via
`AskUserQuestion`: **core-first sequencing** (this slice, reviewed, before
nursing/OT/billing/insurance layer on top); **full TPA cashless** included in
the eventual complete system; **itemized ledger + hospital-defined package
rates** (not government-scheme catalogs); **standard ward charting** (no ICU
ventilator/infusion flowsheet). Full technical design reviewed and approved
via `ExitPlanMode` before any code was written.

## This overrides a documented product decision

Both `PRD-Healthcare-Booking-SaaS-India.md` §6.4 and `PRD-v2-CareOS.md`
explicitly list **"Full IPD/ward management, OT scheduling"** as out of scope,
for a stated competitive reason: compete on cost and deployment speed against
enterprise HIS, not on feature parity. Even the PRD's own `C23 IPD-lite`
candidate is Phase-3/unscheduled, "Med" priority, and scoped only to what the
insurance module's own pre-authorization/discharge flows need — explicitly
**not** what a hospital information system would want
(`project-plans/technical-plans/03-phase3-v2.md` §4). The user has knowingly
and explicitly overridden this. See the companion PRD/phase-plan edits in this
same documentation pass for where that override is now recorded, so the
strategy docs stop silently contradicting the shipped code.

## Current state (before this requirement)

No multi-day "stay" concept existed anywhere in this codebase. Every clinical,
scheduling and billing model — `Appointments`, `Encounters` (`appointment_id
@unique`, sign-and-lock trigger), `Claims` (`appointment_id` required),
`AppointmentPayments` (one payment, one fixed amount) — is hard-anchored to a
single bounded visit. `Rooms` is one consultation room with no bed/occupancy
concept; `Resources`/`AppointmentResources` model borrowing an asset for one
appointment's window, not a standalone multi-day booking lifecycle. None of
these can represent a ward stay without becoming a fundamentally different
model — confirmed by a dedicated codebase-audit research pass before any
schema was written, not assumed.

## What this ships

- **`Wards`/`Beds`** — a ward groups beds by type (`general|semi_private|
  private|deluxe|suite|icu|hdu|nicu|picu|maternity|isolation|day_care`,
  free text matching this schema's existing lookup-value convention). A
  ward's room-day and nursing tariffs are `Products` rows (not new price
  columns) — see "Reuse" below.
- **`Admissions`** — the stay itself, the IPD aggregate root exactly as
  `appointment_id` is the OPD one. Full ADT status lifecycle
  (`pending|admitted|discharge_initiated|discharged|cancelled|lama|
  absconded|expired`), admission type driving default billing mode
  (insurance → package, else itemized), nullable `source_appointment_id`/
  `source_encounter_id` for a planned admission converted from an OPD
  consult (null for an emergency admission — the exact reason `Encounters`/
  `Claims` cannot be reused). Length-of-stay is derived at read time, not
  stored.
- **`BedOccupancies`** — the bed timeline, and the single most load-bearing
  table in the design. One table covers occupied/reserved/cleaning/blocked
  because a Postgres GiST `EXCLUDE` constraint protects exactly one table;
  splitting it would leave a reservation able to physically collide with a
  real admission with no database guarantee stopping it. Admit, transfer,
  and discharge are each one transaction writing this timeline, the
  `Beds.status` cache, the `Admissions` row, and an `AdmissionEvents` entry
  together.
- **Live bed board** — a single bounded query (org+clinic-scoped, denormalised
  `client_org_id`/`clinic_id` on `Beds` for exactly this) returning every bed's
  live status plus whoever is in it, with a summary (occupancy rate correctly
  excluding blocked beds from the denominator).
- **`MlcRegisters`/`MlcAmendments`** — the statutory medico-legal case
  register. A filed register is genuinely immutable, enforced by a Postgres
  trigger (verified by attacking the table directly, bypassing every service
  check), with a single carve-out for the police-intimation block (fillable
  once, later, for the 24h statutory obligation). Corrections are appended,
  attributed amendments, never in-place edits.
- **`IpdBillingSettings`** — table created in this slice (unwired until
  slice 4) so the eventual billing layer needs no second migration.
- **Frontend** — `pages/ipd/BedBoard.jsx` (live board, polled every 10s per
  `DATA-12`'s cap, deliberately not a subscription this slice — cut and
  recorded as such) and `pages/ipd/Admissions.jsx` (list, New Admission flow,
  detail dialog with bed history/timeline/transfer/discharge/cancel/MLC
  filing). Both gated to the same role set as the backend read gate
  (`staff|clinician|manager|admin|super_admin`), matching the `/queue`
  module's own dedicated-`RoleGuard` precedent.
- **Entitlement gating** — a new `ipd` plan feature flag
  (`admin/Plans.jsx`'s `FEATURE_FLAG_KEYS`), enforced per-mutation via
  `@UseGuards(EntitlementGuard) @RequiresFeature('ipd')` (never the global
  guard chain). Reads stay ungated so an org mid-upgrade sees a real empty
  board, not a confusing 403.

## Reuse decisions (do not rebuild)

- **`InvoiceSequences`** gains `ADM`/`MLC` series via a new shared
  `common/billing/document-numbering.ts`, which also de-duplicated
  `financialYearFor()` from the two places it had already been copied
  (`appointment-payments.service.ts`, `platform-billing.service.ts`) — both
  refactored to the shared helper in this same slice, 201 pre-existing
  tests confirmed still green.
- **Bed/nursing tariffs are `Products` rows.** This single design decision
  buys `resolveServicePrice()`'s full payer-tariff/branch-override/category/
  channel resolution chain, `PayerTariffs`, and GST classification for free
  — the payoff lands in the billing slice, but the schema decision is made
  here so nothing needs revisiting later.
- **Tenant scoping** — `orgScope`/`orgIdForWrite`/`assertSameOrg` from
  `common/scoping/tenant-scope.ts` throughout, never a
  `user.client_org_id ? {...} : {}` ternary. Write paths derive
  `client_org_id` from the already-validated target clinic (the
  `departments.service.ts` precedent), never from the caller's own org —
  the live-reproduced bug class where a platform operator's own org has
  nothing to do with the target clinic's.
- **Audit logging** — free. Every mutation is named verb+PascalCaseNoun
  (`createAdmission`, `transferAdmissionBed`), and the global
  `AuditLogInterceptor` derives action/resource from the field name with no
  bespoke logging code in this module.

## Deliberately NOT built in this slice (recorded, not silently dropped)

- Nursing/ICU charting (vitals, MAR, intake/output, notes, handover) —
  slice 2.
- Operation theatre scheduling — slice 3.
- IPD billing (the charge ledger, room-day accrual, package settlement) —
  slice 4. **No bill exists for an admitted patient in this slice at all**,
  explicitly.
- TPA cashless insurance (pre-authorization, enhancement, claim
  reconciliation) — slice 5.
- Real-time bed board via GraphQL subscriptions — polling only this slice;
  `common/pubsub.module.ts` already exists and makes a real subscription
  cheap to add later.
- Cross-table surgeon/OPD double-booking prevention — out of scope until
  slice 3's OT module exists to need it.

## Acceptance criteria

**US-IPD-01**: As front-desk staff, I can admit a patient into a specific
bed, and the database itself prevents two patients ending up in the same
bed at the same time.
- Given 5 concurrent admission requests for the same bed, when submitted,
  then exactly one succeeds and the other four receive a clean conflict
  message, never a raw database error or a 500. Live-proven under real
  concurrency, not a mocked assertion.
- Given a bed already occupied for a period, when a transfer is backdated
  into that same period, then it is rejected by the same database
  guarantee.

**US-IPD-02**: As a nurse or ward clerk, I can transfer a patient between
beds and see their full placement history.
- Given a live admission, when transferred to a new bed, then the source
  occupancy closes and the destination opens in one atomic operation — a
  crash between the two is not possible.

**US-IPD-03**: As front-desk staff, I can discharge or cancel an admission,
and a mistaken admission genuinely frees the bed rather than leaving a
phantom hold.
- Given an admission cancelled in error, when a new patient is admitted to
  the same bed for the same period afterward, then it succeeds — the
  cancelled occupancy is excluded from the exclusion constraint's own
  predicate.

**US-IPD-04**: As clinical/compliance staff, I can file a medico-legal case
register, and once filed it cannot be silently altered.
- Given a filed MLC register, when any direct database update or delete is
  attempted (bypassing the application entirely), then it is rejected by a
  database trigger, not merely a service-layer check.
- Given a correction is needed, when I file an amendment, then the
  register's own `previous_value` is read from the row itself, never
  accepted as a caller-supplied claim.
- Given 20 hours have passed with no police intimation recorded, then the
  responsible staff are notified, with a 4-hour margin before the real 24h
  statutory deadline.

## Data model impact

New: `Wards`, `Beds`, `BedOccupancies` (+ GiST `EXCLUDE` constraint + 2
`CHECK` constraints), `Admissions`, `AdmissionEvents`, `MlcRegisters` (+
immutability trigger), `MlcAmendments` (+ append-only trigger),
`IpdBillingSettings`. Four new `NotificationEventType` enum values
(`patient_admitted`, `patient_discharged`, `bed_transfer_recorded`,
`mlc_police_intimation_due`), shipped in their own migration applied before
any code referenced them. See `PLAN248` for full field lists and the
migration SQL.

## Verification

Backend: 92 new unit tests across 6 spec files (`wards.service.spec.ts`,
`bed-board.service.spec.ts`, `admissions.service.spec.ts`,
`mlc.service.spec.ts`, both sweep services) — full suite 152 suites/2421
tests. Integration: a dedicated `ipd-adt.int-spec.ts` proving the two
database-level guarantees under real concurrency and real trigger attacks
— 5/5 gates pass, including 5 concurrent admissions into one bed where
exactly one succeeds. Both new domains added as real tenancy-matrix
`CASES` entries (not exemptions), passing every row including the
org-less `__no_org__` sentinel. `tsc`/`eslint` clean throughout. Frontend:
10 new tests across 2 suites, lint 0 errors, build and `size-limit` green.
See `TR268` for full detail.
