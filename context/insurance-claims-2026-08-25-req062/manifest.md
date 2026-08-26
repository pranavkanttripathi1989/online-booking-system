---
id: CTX-insurance-claims-2026-08-25-req062
type: improvement
feature: insurance-claims
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ062
related: [PLAN089, TP116, TR115]
---

# insurance-claims — Patient insurance policy capture UI (2026-08-25)

Closes `project-plans/analysis/08-integration-gap-analysis.md` finding A-7 — part
of the A-4–A-8 gap-fix batch found by a fresh backend-vs-frontend
integration sweep. `REQ031`'s own real, tested
`patientInsurancePolicies`/`createPatientInsurancePolicy` had no frontend
UI at all — front desk had no way to record a patient's payer/policy.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ062 | [Patient insurance policy capture UI](../../requirements/insurance-claims/improvement/REQ062-insurance-claims-2026-08-25-patient-policy-capture-ui.md) |
| implementation-plans | PLAN089 | [implementation plan](../../implementation-plans/insurance-claims/improvement/PLAN089-insurance-claims-2026-08-25-patient-policy-capture-ui.md) |
| test-plans | TP116 | [test plan](../../test-plans/insurance-claims/improvement/TP116-insurance-claims-2026-08-25-patient-policy-capture-ui.md) |
| test-results | TR115 | [results — pass, 4/4](../../test-results/insurance-claims/improvement/TR115-insurance-claims-2026-08-25-patient-policy-capture-ui.md) |

## What shipped

A new "Insurance" tab (real GraphQL, keyed on the real route `:id`, on an
otherwise still-mock-driven page — see the requirement doc's own note on
why this doesn't touch `context/open-questions.md` #13's standing pause)
on `pages/patients/detail.jsx`. New `patients/detail.test.jsx` (3 cases).
e2e coverage added to the shared `frontend/e2e/gap-analysis-a4-a8.spec.js`
(1 of its 4 scenarios), using a directly-inserted `Payers` fixture row
(`createPayer` is `super_admin`-only, no seeded super_admin demo account
exists).

## One real bug found, in the shared e2e fixture file, not this slice's product code

`gap-analysis-a4-a8.spec.js`'s own `psql()` helper was missing a
`return` statement — every "find-or-create" idempotency check silently
fell through to "create" regardless of whether a matching row already
existed, accumulating duplicate `Payers` rows across repeated test runs
and eventually breaking the payer-picker's own option locator (two
same-named options). Fixed, and every `afterAll` cleanup statement in
that file now runs through a `safePsql` wrapper so one failing statement
can no longer silently abort the rest of cleanup — see `TR115`'s own
account for the full details and the confirmed-clean DB state after a
full run.
