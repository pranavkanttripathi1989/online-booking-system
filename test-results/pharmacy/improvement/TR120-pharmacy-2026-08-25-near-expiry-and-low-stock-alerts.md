---
id: TR120
type: improvement
feature: pharmacy
created: 2026-08-25
updated: 2026-08-25
status: pass
parent: TP121
related: [REQ067, PLAN094]
---

# TR120 — Results for near-expiry/low-stock alerts (REQ067)

Executed 2026-08-25 against `medibook_backend`/`medibook_postgres` on
`master`, as part of an 8-slice batch.

## Unit

`pharmacy.service.spec.ts`: 15/15 pass (6 new). `low-stock-sweep.service.spec.ts`:
6/6 pass. Full backend suite (run once at the end of the batch):
**84 suites / 1293 tests**, all passing. Integration: **4 suites / 369
tests**, all passing. `eslint`: 0 errors. `tsc --noEmit`: clean.

## Live verification

`nearExpiryBatches(horizon_days: 365)` against the real dev stack
returned a real seeded Paracetamol batch (expiring 2027-06-01, 95
remaining) — the query, its org-scoping, and the `drug_name` join all
confirmed working end to end. `lowStockDrugs` correctly returned `[]`
(no dev drug has a `reorder_level` set) — the non-empty path is covered
by the unit suite; setting one on a shared fixture just to force a
non-empty live result was judged unnecessary residue for this slice.

## Commits

See the commits immediately following this test-results doc in `git log`.
