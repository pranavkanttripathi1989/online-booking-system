---
id: PLAN252
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: REQ183
related: [TP272, TR272]
---

# PLAN252 — Implementation plan: IPD slice 5 (TPA cashless insurance)

Full design rationale for this slice lives in the approved plan file
(`/Users/pranavkanttripathi/.claude/plans/starry-soaring-bunny.md`) —
this document is the as-built record of what that plan became, and the
final slice of the 5-slice IPD plan.

## Migrations (hand-written, applied via `prisma migrate deploy`)

`20260902500000_notification_event_preauth_enhancement` — one new
`NotificationEventType` value, `preauth_enhancement_needed`, shipped
alone and applied first (`ALTER TYPE ... ADD VALUE` cannot run in the
same transaction that later uses the value — the
`break_glass_requested`/`mlc_police_intimation_due` precedent).

`20260902510000_ipd_insurance_core` — `PreAuthorizations`,
`PreAuthEnhancements` (+ `@@unique([preauth_id, sequence_no])`),
`IpdClaims`, `IpdClaimDeductions`, `IpdInsuranceDocuments` (+ 1 CHECK):

```sql
CONSTRAINT "ipd_insurance_documents_exactly_one_parent"
  CHECK (num_nonnulls("preauth_id", "claim_id") = 1)
```

Verified live via `psql \d+ "IpdInsuranceDocuments"` — the CHECK is
present exactly as declared. `Payers`/`PayerTariffs`/`PayerEmpanelments`/
`PatientInsurancePolicies` are untouched by this migration — confirmed
by reading its own diff end-to-end before applying.

## Backend layout

`backend/src/ipd-insurance/` — `ipd-insurance.service.ts` (the core
service: pre-auth CRUD/decision, `bindPreAuthorizationToAdmission`,
enhancement request/decision, claim CRUD/submit/status/settle,
deduction add/remove, document create, plus small per-service scope
guards mirroring `REQ181`'s own convention rather than reaching into
`admissions.service.ts`'s private helpers), `preauth-utilization-sweep
.service.ts` (`PreAuthUtilizationSweepService`, `@Cron('0 */4 * * *')`),
`ipd-insurance.resolver.ts` (`READ_ROLES`/`FRONT_DESK_ROLES`/
`MANAGER_ROLES` tiers, the `ipd-billing.resolver.ts` precedent exactly),
`ipd-insurance-attachments.controller.ts` (REST upload, no inline role
check — the real access check lives in the GraphQL
`createIpdInsuranceDocument` mutation, the `message-attachments
.controller.ts` precedent), `ipd-insurance.module.ts` (imports
`EntitlementsModule`, `IpdBillingModule` for `IpdBillingService`,
`AuthModule` for `JwtService` — see the real bug below).

## A real bug found live: `IpdInsuranceAttachmentsController` had no `JwtService`

The container crashed on first restart with `Nest can't resolve
dependencies of the IpdInsuranceAttachmentsController ... JwtService at
index [0]`. `encounters.module.ts`/`messages.module.ts` both import
`AuthModule` for exactly this reason (their own attachments controllers
verify a bearer token manually, since the global `GqlAuthGuard` only
protects the GraphQL execution context) — `ipd-insurance.module.ts`'s
first draft omitted it. Fixed by adding `AuthModule` to the module's own
`imports`; confirmed no circular dependency (`AuthModule` imports
nothing back toward `ipd-insurance`). Container then booted clean and
`/ipd-insurance-documents/upload` mapped correctly.

## A real race-condition bug found and fixed before any live test ran

`bindPreAuthorizationToAdmission`'s first draft read the pre-auth,
checked `admission_id` was null, then issued a plain `update()`. Two
concurrent binds of the **same** pre-auth to two **different**
admissions could both pass the null check (a classic check-then-act
race) — the second caller's write would silently overwrite the first's
with no error at all, corrupting the binding with no trace. Caught by
re-reading the method against the plan's own stated gate ("a second
admission can't bind it") before writing the integration test, not by a
failing run.

**Fix**: replaced the read-then-write with a single atomic
`updateMany({ where: { id: preauth.id, admission_id: null }, data: {
admission_id } })`, checking the returned `count`. `count === 0` means
someone else already bound it in between — a clean `ConflictException`,
not a silent clobber. The pre-existing `@unique` constraint on
`admission_id` still does its own, separate job: stopping this
*admission* from ending up bound to a *different* pre-auth
concurrently (caught as a `P2002` translation). Two guarantees, two
different race shapes, neither substitutes for the other — documented
inline in the method itself.

Live-proven under real concurrency in `ipd-insurance.int-spec.ts`: two
admissions for the same patient (the first flipped to `discharged`
directly via Prisma so the second could even be created — a patient can
only have one *live* admission, `admissions.service.ts`'s own rule) race
`Promise.all`-style to bind the same approved pre-auth; exactly one
succeeds, the other's error matches `/already bound/i`.

## Frontend

`frontend/src/pages/ipd/IpdInsurance.jsx` — desktop-dense tier (verified
1280/1440), page-local `gql`. Top-level nav entry (`/ipd/insurance`,
`VerifiedUserIcon`) inside the same `RoleGuard` block as the rest of the
IPD surface. An "Insurance" action on `Admissions.jsx`'s detail dialog
deep-links via `?admission=<id>`, matching `IpdBilling.jsx`'s own
precedent exactly. Document upload reuses `messages/index.jsx`'s own
`uploadStagedAttachment` pattern (httpOnly session cookie via
`credentials: 'include'`, no bearer header at all) rather than the
first draft's invented `localStorage.getItem('medibook_access_token')`
call — that key has never existed since `REQ145`'s own SEC-2 fix moved
tokens into httpOnly cookies; caught before commit by checking the real
precedent instead of assuming a plausible-looking pattern.

## Verification

Backend: `npx tsc --noEmit` and `npx eslint
"{src,apps,libs,test}/**/*.ts"` clean throughout. Full unit suite 166
suites/2637 tests (up from 164/2584). Live schema introspection
confirmed every new query/mutation genuinely served on container boot
(after the `AuthModule` fix above). Integration:
`ipd-insurance.int-spec.ts` 5/5 gates pass; full integration suite
13/13 suites, 516/516 tests (up from 502);
`matrix-coverage.int-spec.ts` green with a new `ipd-insurance` `CASES`
entry (`preAuthorizations`, the `wards`/`operation-theatre`/
`ipd-billing` precedent). Frontend: `eslint` 0 errors (only the
pre-existing, accepted `I18N-1` warning class), `npm run build` and
`npm run size` green, 2/2 new tests, `Admissions.test.jsx` (6/6) still
green after adding the "Insurance" action.

This closes the 5-slice IPD plan (`REQ179`→`REQ180`→`REQ181`→
`REQ182`→`REQ183`) approved and scoped at the very start of this body
of work.
