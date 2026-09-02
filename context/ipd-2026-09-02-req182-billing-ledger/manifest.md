---
id: CTX-ipd-2026-09-02-req182-billing-ledger
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: REQ182
related: [PLAN251, TP271, TR271, REQ179, REQ180, REQ181]
---

# ipd — slice 4: billing ledger, room-day accrual, package settlement (2026-09-02)

Slice 4 of the 5-slice IPD plan approved alongside slice 1 (`REQ179`,
`context/ipd-2026-09-02-req179/manifest.md`) and built directly on slice
3's operation-theatre work (`REQ181`,
`context/ipd-2026-09-02-req181-operation-theatre/manifest.md`) —
core-first sequencing. Triggered by a bare `continue` after slice 3
shipped, tested, documented, and was pushed. Interrupted once mid-slice
by a Docker daemon lockup (a targeted `docker restart medibook_backend`
hung with zero output); the user said "restart docker app" and the
established full quit/relaunch recovery was applied with zero data loss.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ182 | [doc](../../requirements/ipd/requirement/REQ182-ipd-2026-09-02-billing-ledger-package-settlement.md) |
| implementation-plans | PLAN251 | [doc](../../implementation-plans/ipd/requirement/PLAN251-ipd-2026-09-02-billing-ledger-package-settlement.md) |
| test-plans | TP271 | [doc](../../test-plans/ipd/requirement/TP271-ipd-2026-09-02-billing-ledger-package-settlement.md) |
| test-results | TR271 | [doc](../../test-results/ipd/requirement/TR271-ipd-2026-09-02-billing-ledger-package-settlement.md) |

## What shipped

- **New `backend/src/ipd-billing/` module**: `IpdBills`/`IpdCharges`/
  `IpdPayments` (the append-only ledger, maintained running totals),
  `IpdPackages`/`IpdPackageInclusions` (package settlement as one signed
  adjustment charge, never a mode switch), `RoomDayAccrualService` (cron +
  on-read catch-up, idempotent via 2 partial unique indexes).
- **Every existing charge-producing domain wired through one funnel**
  (`IpdBillingService#postCharge()`): doctor-round notes, given
  medication doses, OT theatre usage, OT consumables — each with a stated
  fail-safe when its own charge item isn't configured.
- **The first real call site wiring `PayerTariffs` into an actual posted
  charge**, not just a read-only quote — the payoff of slice 1's own
  decision to model bed/OT/nursing/doctor-visit rates as real `Products`
  rows.
- **Frontend**: `pages/ipd/IpdBilling.jsx`, a billing console with a bill
  list, charges/payments/package tabs, manual-charge and payment dialogs,
  package management, and a billing-settings dialog — reached both as a
  top-level nav entry and via a deep-link from the admissions detail
  dialog.

## The real bug found and fixed this slice

`finalizeBill`/`unfinalizeBill`'s gross-recomputation excluded reversed
charges from its `SUM`, while `postCharge`/`reverseCharge`'s own
maintained running total never did — the two definitions of "what counts"
diverged by exactly a reversed charge's own amount on every reversal.
Caught by the integration spec's own invariant assertion
(`bill.gross_paise === SUM(charges.total_paise)`) on its first real run,
not by code review. Fixed by adopting one consistent rule everywhere:
`is_reversed` is a display/status flag only, never a sum filter. Full
account in `PLAN251`.

## Deliberately NOT built in this slice (recorded, not silently dropped)

TPA cashless (pre-authorization, enhancement, claim reconciliation) —
slice 5, the final slice. Government-scheme package catalogs (PMJAY/
CGHS) — the plan's own confirmed scope is hospital-defined packages only.

## Verification

Backend: 47 new/updated unit tests, full suite 164 suites/2584 tests,
`tsc`/`eslint` clean. Integration: `ipd-billing.int-spec.ts` 5/5 gates
(including the invariant assertion that caught the bug above, idempotent
accrual, a "missed cron night" stay, real `PayerTariffs` wiring, and
gapless concurrent bill-number allocation), full suite 12/12 suites,
502/502 tests, `matrix-coverage.int-spec.ts` green with a new
`ipd-billing` `CASES` entry. Live schema introspection confirmed every
new query/mutation genuinely served on the first container boot.
Frontend: build/lint/size-limit green, `IpdBilling`'s own lazy chunk
6.33kB gzipped, 2/2 new tests, `Admissions.test.jsx` still green.

## Commits

`b0e4b8c` (backend), `0b77cea` (backend tests), `85bc825` (frontend).
