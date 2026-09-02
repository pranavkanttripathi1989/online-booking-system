---
id: CTX-ipd-2026-09-02-req179
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: REQ179
related: [PLAN248, TP268, TR268]
---

# ipd — slice 1: in-patient ADT core, wards, beds, live bed board, medico-legal register (2026-09-02)

Direct user request: integrate nursing home / hospital / ICU / private ward /
normal ward / operation theatre, "all services operations, and billing" as a
**complete system**, competitor-informed, with a detailed requirements and
technical plan first. This deliberately overrides both PRDs' own explicit
"Full IPD/ward management, OT scheduling — out of scope" stance (see the
companion PRD/phase-plan edits in this same pass). Preceded by two parallel
research forks (a codebase audit of what already exists to build on, and real
Indian HMS/IPD competitor research — Insta HMS/Practo, MocDoc) plus a
dedicated schema-design agent pass, all before any code — then four
`AskUserQuestion` decisions (core-first sequencing; full TPA cashless
eventually; itemized ledger + hospital-defined package rates, not government
schemes; standard ward charting, not full ICU flowsheets) and a full technical
plan approved via `ExitPlanMode` before implementation began.

This is slice 1 of 5 (core-first, per the user's own confirmed sequencing).
Slices 2–5 (nursing/ICU charting, operation theatre, IPD billing, TPA
cashless insurance) are deliberately not started — the core stay model gets
its own reviewed checkpoint before anything is built on top of it.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ179 | [doc](../../requirements/ipd/requirement/REQ179-ipd-2026-09-02-adt-core-wards-beds-mlc.md) |
| implementation-plans | PLAN248 | [doc](../../implementation-plans/ipd/requirement/PLAN248-ipd-2026-09-02-adt-core-wards-beds-mlc.md) |
| test-plans | TP268 | [doc](../../test-plans/ipd/requirement/TP268-ipd-2026-09-02-adt-core-wards-beds-mlc.md) |
| test-results | TR268 | [doc](../../test-results/ipd/requirement/TR268-ipd-2026-09-02-adt-core-wards-beds-mlc.md) |

## What shipped

- **Schema** (`20260902100000_notification_events_ipd_core`,
  `20260902110000_ipd_adt_core`, both additive): `Wards`, `Beds`,
  `BedOccupancies` (+ GiST `EXCLUDE` constraint + 2 `CHECK`s), `Admissions`,
  `AdmissionEvents`, `MlcRegisters` (+ immutability trigger),
  `MlcAmendments` (+ append-only trigger), `IpdBillingSettings` (table
  only, unwired until slice 4). Four new `NotificationEventType` enum
  values shipped alone, applied first.
- **New `backend/src/wards/` and `backend/src/admissions/` modules**:
  admit/transfer/discharge/cancel, a live bed board, the statutory MLC
  register with its own immutable-audit-trail workflow. Entitlement-gated
  per-mutation via a new `ipd` plan feature flag; reads stay ungated.
- **Frontend**: `pages/ipd/BedBoard.jsx` (live, polled every 10s) and
  `pages/ipd/Admissions.jsx` (list, New Admission flow, detail dialog with
  transfer/discharge/cancel/MLC actions), both gated to the same role set
  as the backend read gate.
- **Reuse over rebuild**: bed/nursing tariffs are `Products` rows (inherits
  `resolveServicePrice`/`PayerTariffs`/GST for free — the payoff lands in
  the future billing slice); `InvoiceSequences` gained `ADM`/`MLC` series
  through a new shared `common/billing/document-numbering.ts`, which also
  de-duplicated `financialYearFor()` from its two existing copies.

## The core database guarantee, proven under real concurrency

`bed_occupancies_no_double_occupancy` — a Postgres GiST `EXCLUDE`
constraint over `(bed_id, tsrange(start_at, end_at))`. There is
deliberately no application-level lock (an availability check and an
insert are two statements; N concurrent requests could all pass the check
before any wrote — the exact race `appointments_no_overlap_exclusion_
constraint` was built to kill). One table covers occupied/reserved/
cleaning/blocked because an exclusion constraint protects exactly one
table — splitting it would leave a reservation able to physically collide
with a real admission with nothing stopping it. Verified in
`ipd-adt.int-spec.ts`: 5 concurrent admissions into one bed, exactly one
succeeds, the other four get a clean conflict message.

## Real bugs found and fixed during this pass

1. **Postgres SQLSTATE `23P01` is not one of Prisma's mapped error
   codes.** The first bed-overlap-conflict translator checked
   `err.code === '23P01'`, which silently never matched — the constraint
   fired correctly and the caller still got a raw Postgres error dump.
   Found by the integration spec's own backdated-transfer assertion
   failing against the real error text, not by review. Fixed by matching
   on the constraint name in the message string instead, the same pattern
   `appointments.service.ts` already uses.
2. **MLC tables resist `DELETE` from every code path, including test
   cleanup** — found while writing the integration spec's own teardown,
   which hit the exact "append-only"/"cannot be deleted" trigger the
   feature is designed to enforce. Correct behaviour, not a defect;
   `TRUNCATE` (the one operation Postgres exempts from per-row triggers)
   is the only way to clear these tables in a throwaway test database,
   and remains entirely unreachable from application code.

## Deliberately NOT built in this slice (recorded, not silently dropped)

Nursing/ICU charting, operation theatre scheduling, IPD billing (no bill
exists for an admitted patient in this slice at all), TPA cashless
insurance — each is its own future slice per the confirmed core-first
sequencing. Real-time bed board via GraphQL subscriptions (polling only
this slice — `pubsub.module.ts` makes a real subscription cheap later).
Cross-table surgeon/OPD double-booking prevention (no OT module exists
yet to need it).

## Verification

Backend: 152 suites / 2421 unit tests (up from 146/2348 pre-slice), zero
regressions. A dedicated `ipd-adt.int-spec.ts` proves both database-level
guarantees under real concurrency and real trigger attacks — 5/5 gates
pass. Both new domains (`wards`, `admissions`) added as real
tenancy-matrix `CASES` entries, passing every row including the org-less
`__no_org__` sentinel. `tsc`/`eslint` clean throughout. Frontend: 10 new
tests across 2 suites, lint 0 errors (ratchet not increased), build and
`size-limit` green. Live: schema introspection against the running
`medibook_backend` container confirmed all 9 new queries and all 16 new
mutations are genuinely served.
