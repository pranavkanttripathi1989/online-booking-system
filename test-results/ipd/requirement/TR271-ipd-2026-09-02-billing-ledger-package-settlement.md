---
id: TR271
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: TP271
related: [REQ182, PLAN251]
---

# TR271 — Test results: IPD slice 4 (billing ledger, room-day accrual, package settlement)

## Outcome

All cases in `TP271` pass. 47 new/updated unit tests: `ipd-billing
.service.spec.ts` (30, new), `room-day-accrual.service.spec.ts` (8, new),
plus 9 new cases across the 4 existing specs whose services gained a
charge-posting call site (`mar.service.spec.ts` +2, `nursing.service
.spec.ts` +3, `ot-bookings.service.spec.ts` +2, `ot-consumables.service
.spec.ts` +2).

Full backend unit suite: **164 suites / 2584 tests** (up from 162/2537),
all passing. `npx tsc --noEmit` and `npx eslint
"{src,apps,libs,test}/**/*.ts"` clean.

## The real bug this slice's own integration spec caught

`ipd-billing.int-spec.ts`'s invariant assertion failed on its first run:
`Expected: 95000, Received: 120000`, after a ₹1000 room charge + ₹200
nursing charge, a ₹250 manual charge, and that manual charge's own
reversal. `recomputeGross()` was excluding reversed charges from its sum
while the maintained running total never did — a genuine, previously
un-caught financial-correctness defect, described in full in `PLAN251`.
Fixed (the sum is now unconditional over every charge; `is_reversed` is
display-only), and the assertion — plus the full 30-test unit spec and
8-test accrual spec, neither of which had encoded the old wrong shape —
all pass afterward. This is direct evidence for why a real-Postgres
integration assertion of a domain's own core invariant matters: a mocked
unit test cannot catch a divergence between two *different* code paths'
own definitions of the same sum.

## Live-only checks

Container restarted after `docker exec medibook_backend npx prisma
generate` + schema regeneration. Booted cleanly on the first attempt — no
`@Args` reflection failure, the lesson from `REQ180`/`REQ181` held again.
Live GraphQL introspection confirmed every new operation:

Queries: `ipdBillingSettings`, `admissionIpdBill`, `ipdBill`, `ipdBills`,
`ipdPackages`, `ipdPackage` — all FOUND.

Mutations: `updateIpdBillingSettings`, `postManualIpdCharge`,
`reverseIpdCharge`, `recordIpdPayment`, `selectIpdPackage`,
`finalizeIpdBill`, `unfinalizeIpdBill`, `createIpdPackage`,
`updateIpdPackage`, `deleteIpdPackage` — all FOUND.

## Integration

New `ipd-billing.int-spec.ts`, 5/5 gates pass against real Postgres:

1. The core invariant (`bill.gross_paise === SUM(charges.total_paise)`)
   after a real manual-charge + reversal + payment sequence — the
   assertion that caught the bug above.
2. Idempotent room-day accrual: 3 real sweep runs on the same admission
   produce an identical charge count after each run.
3. A "missed cron night" stay: accrual only ever called once, on-demand,
   4 days post-admission — still produces the correct number of
   room-day charges with no gap.
4. A real `PayerTariffs` row (₹400) against the ward's bed product versus
   the base price (₹1000) — the posted room-day charge's own
   `total_paise` matched the tariff exactly, asserted as
   `roomCharge.total === 400`, with zero new pricing code.
5. `bill_number` gapless and collision-free across 8 admissions'
   bills finalized concurrently via `Promise.all`.

Full integration suite: **12 suites / 502 tests** (up from 488), all
passing. `matrix-coverage.int-spec.ts` green with a new `ipd-billing`
`CASES` entry (`ipdBills`, the `wards`/`operation-theatre` precedent) —
the new domain's own row passed all role/org combinations against real
Postgres.

## Frontend

`npx eslint` on the touched files: 0 errors (only the pre-existing,
accepted `I18N-1` warning class, plus one real unused-import finding
fixed before commit — an unused `formatDateTime` import in
`IpdBilling.jsx`). `npm run build` succeeded; `IpdBilling` received its
own lazy chunk (23.41kB / 6.33kB gzipped). `npm run size` green on all
four budgets (initial bundle 331.44kB/350kB, largest lazy chunk
109.93kB/115kB, RichTextEditor chunk 125.06kB/130kB, initial CSS
13.59kB/18kB). 2 new tests (`IpdBilling.test.jsx` — the empty state, and
a real bill rendered with its patient/admission-number/balance, not mock
data), both passing. `Admissions.test.jsx` (6/6) still green after adding
the "Billing" deep-link action; `AppShell.test.jsx` passes cleanly in
isolation (its one failure in a full-parallel run is confirmed
pre-existing resource-contention flakiness, matching this codebase's own
documented pattern, not a regression from the one-line nav addition).

## Commits

- `b0e4b8c` feat(backend): IPD slice 4 -- billing ledger, room-day accrual, package settlement
- `0b77cea` test(backend): IPD slice 4 unit + integration coverage -- billing ledger
- `85bc825` feat(frontend): IPD slice 4 -- billing console
