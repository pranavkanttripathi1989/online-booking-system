---
id: TR101
type: improvement
feature: appointments
created: 2026-08-25
updated: 2026-08-25
status: done
parent: TP102
related: [PLAN075]
---

# TR101 — Test results: auto-no-show sweep + configurable intake fields

Commit: (recorded at commit time, see the `context/` manifest for this
bundle for the final SHA)

## TP102 case outcomes

All 20 cases pass. `no-show-sweep.service.spec.ts` (5 cases),
`intake-fields.service.spec.ts` (13 cases), 3 new describe blocks in
`appointments.service.spec.ts` (repeat-no-show override, intake fields,
plus a fix to one pre-existing test — see below), 2 new cases in
`org-settings.service.spec.ts`, and the new `intake-fields` tenancy-matrix
domain case all green.

## Full verification suite (Hard Rule 3)

| Check | Result |
|---|---|
| `npx prisma validate` | Clean |
| `backend: npx jest --maxWorkers=2` | 76/76 suites, 1096/1096 tests (was 74/1071 after REQ051) |
| `backend: npm run test:int` (from host) | 4/4 suites, 333/333 tests (was 324) |
| `backend: eslint` | Clean |
| `backend: tsc --noEmit` | Clean |

## A real bug found and fixed, via a test failure

The first draft of `AppointmentsService.create()` made a **second**,
unconditional `clinics.findUnique` call to resolve the no-show
prepayment threshold, separate from the existing org-ownership-check
lookup (which only runs for a caller with an org). This broke the
pre-existing test `'is a no-op for an org-less caller'`, which asserted
`clinics.findUnique` is never called at all for such a caller — a real
design smell (two queries for the same row), not just an outdated test.
Fixed by consolidating into one lookup, used by both the still-conditional
ownership check and the now-unconditional threshold resolution. Updated
the test to assert what it actually guarantees (no ownership-mismatch
rejection for an org-less caller), since the lookup itself now legitimately
always happens.

## Direction confirmed mid-slice

The user asked whether frontend integration should be part of each slice.
Confirmed via `AskUserQuestion`: this batch stays backend-only through all
8 slices, matching how Phase G+2 was actually executed — a dedicated
frontend-completion pass follows once every slice ships. Logged here so
this isn't mistaken for an oversight when reviewed later.
