---
id: TR272
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: TP272
related: [REQ183, PLAN252]
---

# TR272 — Test results: IPD slice 5 (TPA cashless insurance)

## Outcome

All 53 unit-level cases in `TP272` pass. 53 new unit tests:
`ipd-insurance.service.spec.ts` (45), `preauth-utilization-sweep
.service.spec.ts` (8).

Full backend unit suite: **166 suites / 2637 tests** (up from
164/2584), all passing. `npx tsc --noEmit` and `npx eslint
"{src,apps,libs,test}/**/*.ts"` clean.

## Two real bugs found and fixed this slice

1. **Missing `JwtService` dependency.** The container crashed on first
   restart: `Nest can't resolve dependencies of the
   IpdInsuranceAttachmentsController ... JwtService at index [0]`.
   `ipd-insurance.module.ts`'s first draft omitted `AuthModule`, which
   `encounters.module.ts`/`messages.module.ts` both import for the
   identical reason (their own REST attachment controllers verify a
   bearer token manually). Fixed by adding it; confirmed no circular
   dependency. Container then booted clean on the next restart.
2. **A genuine race condition in `bindPreAuthorizationToAdmission`**,
   found by re-reading the method against the plan's own stated gate
   before writing the integration test — not by a failing run. The
   original read-then-write let two concurrent binds of the SAME
   pre-auth to two DIFFERENT admissions both pass a null check, with
   the second silently overwriting the first with no error at all.
   Fixed with a single atomic `updateMany({ where: { id, admission_id:
   null }, ... })`, checking the affected-row count. Full account in
   `PLAN252`.

## Live-only checks

Container restarted after `docker exec medibook_backend npx prisma
generate` + schema regeneration. Crashed once on the `JwtService` bug
above; booted cleanly on the next restart once `AuthModule` was added.
Live GraphQL introspection confirmed every new operation:

Queries: `preAuthorizations`, `preAuthorization`,
`admissionPreAuthorization`, `ipdClaims`, `ipdClaim`, `admissionIpdClaim`
— all FOUND.

Mutations: `createPreAuthorization`, `updatePreAuthorizationStatus`,
`bindPreAuthorizationToAdmission`, `requestPreAuthEnhancement`,
`decidePreAuthEnhancement`, `createIpdClaim`, `submitIpdClaim`,
`updateIpdClaimStatus`, `settleIpdClaim`, `addIpdClaimDeduction`,
`removeIpdClaimDeduction`, `createIpdInsuranceDocument` — all FOUND.

## Integration

New `ipd-insurance.int-spec.ts`, 5/5 gates pass against real Postgres:

1. A pre-authorization approved with no admission, then bound to a real
   admission created separately via the real `createAdmission` mutation.
2. Two admissions racing (`Promise.all`) to bind the SAME approved
   pre-auth — exactly 1 succeeded, the other rejected with a message
   matching `/already bound/i`, proving the atomic-`updateMany` fix
   against genuine concurrency.
3. `requestPreAuthEnhancement`'s `bill_amount_at_request` matched the
   real `admissionIpdBill`-computed gross total exactly.
4. `settleIpdClaim` posted a real `payer_settlement` `IpdPayments` row;
   the bill's own `paid` increased by exactly the settled amount, and
   the payment appeared in the bill's own `payments` list.
5. `Payers`/`PatientInsurancePolicies`/`PayerEmpanelments` fixture rows
   created for `REQ031` (long before this slice existed) were read back
   with their exact original shape — zero schema drift confirmed
   directly, not just asserted.

Full integration suite: **13 suites / 516 tests** (up from 502), all
passing. `matrix-coverage.int-spec.ts` green with a new `ipd-insurance`
`CASES` entry (`preAuthorizations`, the `wards`/`operation-theatre`/
`ipd-billing` precedent) — the new domain's own row passed all
role/org combinations against real Postgres.

## Frontend

`npx eslint` on the touched files: 0 errors (only the pre-existing,
accepted `I18N-1` warning class). `npm run build` succeeded;
`IpdInsurance` received its own lazy chunk. `npm run size` green on all
four budgets (initial bundle 331.57kB/350kB, largest lazy chunk
109.93kB/115kB, RichTextEditor chunk 125.06kB/130kB, initial CSS
13.59kB/18kB). 2 new tests (`IpdInsurance.test.jsx` — the empty state,
and a real pre-authorization rendered with its patient/payer/authorized
total, not mock data), both passing. `Admissions.test.jsx` (6/6) still
green after adding the "Insurance" deep-link action.

## Commits

- `8c00680` feat(backend): IPD slice 5 -- TPA cashless: pre-auth, enhancement, claim reconciliation
- `b9e6067` test(backend): IPD slice 5 unit + integration coverage -- TPA cashless
- `ef8901c` feat(frontend): IPD slice 5 -- TPA cashless insurance console

## This closes the 5-slice IPD plan

`REQ179` (ADT core) → `REQ180` (nursing charting) → `REQ181` (operation
theatre) → `REQ182` (billing ledger) → `REQ183` (TPA cashless insurance)
— approved via `ExitPlanMode` at the very start of this body of work,
built core-first with each slice its own reviewed, tested, documented,
pushed checkpoint before the next began. The PRD-scope override this
plan required (both `PRD-Healthcare-Booking-SaaS-India.md` and
`PRD-v2-CareOS.md` list full IPD/ward management as out of scope) was
recorded in slice 1's own documentation (`REQ179`/`PLAN248`).
