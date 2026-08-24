---
id: CTX-organizations-2026-08-25-req055
type: improvement
feature: organizations
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ055
related: [REQ014, REQ016, PLAN078, TP105, TR104]
---

# organizations — REQ055: org->branch masters cascade (2026-08-25)

Fifth slice in the 8-slice batch picked from `project-plans/` this session
(research cross-checked against real code — see
`queue-management-2026-08-25-req051`'s manifest for the full research
account).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ055 | [org->branch masters cascade](../../requirements/organizations/improvement/REQ055-organizations-2026-08-25-branch-masters-cascade.md) |
| implementation-plans | PLAN078 | [implementation plan](../../implementation-plans/organizations/improvement/PLAN078-organizations-2026-08-25-branch-masters-cascade.md) |
| test-plans | TP105 | [verification plan](../../test-plans/organizations/improvement/TP105-organizations-2026-08-25-branch-masters-cascade.md) |
| test-results | TR104 | [verification results — pass, 79/79 + 4/4 suites](../../test-results/organizations/improvement/TR104-organizations-2026-08-25-branch-masters-cascade.md) |

## What shipped

A pre-plan research pass found that a clinical service created via
`createService` is already, today, an org-level master (`clinic_id:
null`, visible identically to every branch) — reframing the story from
"add an org-level default layer" to "add the missing branch-override
layer on top of an already-existing master." New `ProductBranchOverrides`
(one row per `(product, clinic)`, absence = inherit, zero migration risk
for existing data). `resolveServicePrice()` gains a 4th, optional
`branchOverride` argument — the single shared pricing helper from
`REQ016`, not a second parallel lookup. New `backend/src/branch-overrides/`
module. Both real charge-determining call sites
(`createRazorpayOrder`/`recordCounterPayment`) now apply the branch's
stance; the list-preview call site in `appointments.service.ts` is
deliberately left unwired (N+1 risk), documented as a named follow-up in
`REQ055` itself.

## Two eslint-caught issues, not design bugs

Unlike `REQ051`–`REQ053`, nothing was wrong with the design or the
tenant-isolation logic. `eslint` caught two incompleteness issues before
the test suite even ran: an entity missing the override's own
category/channel pricing fields (fixed by reusing
`CategoryPricingType`/`ChannelPricingType` from `services`), and an unused
test fixture that should have had a real assertion (fixed by adding the
cross-org test it was declared for). Full account in `PLAN078`.

## Verification

Backend unit: 79/79 suites, 1165/1165 tests (was 78/1141). Integration
(from host): 4/4 suites, 351/351 tests (was 342), including a new
`branch-overrides` tenancy-matrix `CASES` row. `eslint`/`tsc --noEmit`
clean. Container restarted and confirmed a clean compile.
