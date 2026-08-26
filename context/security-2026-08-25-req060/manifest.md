---
id: CTX-security-2026-08-25-req060
type: improvement
feature: security
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ060
related: [PLAN087, TP114, TR113]
---

# security — Clinician verification UI (2026-08-25)

Closes `project-plans/analysis/08-integration-gap-analysis.md` finding A-4 — part
of the A-4–A-8 gap-fix batch found by a fresh backend-vs-frontend
integration sweep. Real, tested `updateClinicianVerification` mutation
had no frontend UI at all.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ060 | [Clinician verification UI](../../requirements/security/improvement/REQ060-security-2026-08-25-clinician-verification-ui.md) |
| implementation-plans | PLAN087 | [implementation plan](../../implementation-plans/security/improvement/PLAN087-security-2026-08-25-clinician-verification-ui.md) |
| test-plans | TP114 | [test plan](../../test-plans/security/improvement/TP114-security-2026-08-25-clinician-verification-ui.md) |
| test-results | TR113 | [results — pass, 5/5](../../test-results/security/improvement/TR113-security-2026-08-25-clinician-verification-ui.md) |

## What shipped

A verification-status chip, registration-number/medical-council caption,
and Verify/Reject/Re-open-for-review actions (gated `admin`/
`super_admin`, matching the resolver's own gate) on
`pages/clinicians/detail.jsx`. `graphql/queries.js`'s `CLINICIAN_FIELDS`
fragment extended with the four fields this needed. New
`clinicians/detail.test.jsx` (4 cases). e2e coverage added to the shared
`frontend/e2e/gap-analysis-a4-a8.spec.js` (1 of its 4 scenarios).

No backend change, no new bugs found in this individual slice — see
`TR115`'s own account (insurance-claims) for the one real bug found
across this batch, in the shared e2e fixture file's own cleanup helper,
not in this slice's product code.
