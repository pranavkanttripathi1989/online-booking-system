---
id: TR100
type: improvement
feature: queue-management
created: 2026-08-25
updated: 2026-08-25
status: done
parent: TP101
related: [PLAN074]
---

# TR100 — Test results: mandatory pre-consultation checklist

Commit: (recorded at commit time, see the `context/` manifest for this
bundle for the final SHA)

## TP101 case outcomes

All 19 cases pass. `checklist.service.spec.ts` (new, 17 cases) and
`queue.service.spec.ts` (2 new cases in the `callNext` describe block, in
addition to its existing 3) all green. The `checklist` tenancy-matrix
domain-case row (case 19) passes across both `tenancy.int-spec.ts` and
`matrix-coverage.int-spec.ts`.

## Full verification suite (Hard Rule 3)

| Check | Result |
|---|---|
| `npx prisma validate` | Clean |
| `backend: npx jest --maxWorkers=2` | 74/74 suites, 1071/1071 tests (was 73/1053 before this slice) |
| `backend: npm run test:int` (from host) | 4/4 suites, 324/324 tests (was 315 before this slice) |
| `backend: eslint` | Clean — one real error caught and fixed during this pass (see below) |
| `backend: tsc --noEmit` | Clean |

## A real lint error caught during this pass

`checklist.service.spec.ts`'s first draft declared an `orgBUser` actor
fixture but never used it — every test used `orgAUser`/`platformUser` and
targeted `clinicB` directly rather than authenticating as an org-B caller.
`eslint`'s `no-unused-vars` rule caught it. Rather than delete the unused
declaration, it exposed a genuine test-coverage gap: the new no-args
"list my org's own items" path (`list(undefined, undefined, user)`) had
only been tested from org A's side. Added a real test — an org-B caller
with no `clinic_id` argument sees only org B's items — closing the gap
`orgBUser`'s presence was implicitly flagging.

## Design correction caught before writing code

Exploring `queue.service.ts`'s real `callNext()` method (per the working
loop's own "explore before planning" step) found that `Encounters` rows
are created on the same `transitionStatus('in_consultation')` path
`callNext()` itself participates in — meaning an encounter usually does
not exist yet at call-next time. The original plan sketch assumed the
checklist would gate on "the current encounter"; this was corrected to
gate on `appointment_id` instead before any schema or code was written.
See `PLAN074` for the full account.
