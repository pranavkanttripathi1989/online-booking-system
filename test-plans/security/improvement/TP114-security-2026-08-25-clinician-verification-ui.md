---
id: TP114
type: improvement
feature: security
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN087
related: [REQ060]
---

# TP114 — Test plan for clinician verification UI

## Frontend unit — `frontend/src/pages/clinicians/detail.test.jsx` (new)

| # | Case | Expected |
|---|---|---|
| 1 | Verification chip + registration details render | Status chip shows `pending`; registration number/medical council caption shown |
| 2 | Non-verifier role (e.g. manager) | Verify/Reject buttons are not rendered at all |
| 3 | Admin verifies a pending clinician | Real `updateClinicianVerification` mutation fires with `{id, status: 'verified'}`; success snackbar shown; refetch reflects the new status |
| 4 | Mutation failure | Real server error message shown via a snackbar, not a silent failure |

## e2e — `frontend/e2e/gap-analysis-a4-a8.spec.js` (shared A-4–A-8 fixture file, new)

| # | Scenario | Assertion |
|---|---|---|
| 1 | Admin opens the real seeded clinician's detail page and clicks Verify | The real mutation response is OK with no GraphQL errors; the chip updates to "verified"; "Re-open for review" appears; status is reverted to `pending` afterward for repeatable runs |

## Full-suite gate before commit (Hard Rule 3)

```
cd frontend && npm run lint && npm test -- --runInBand && npm run build
npx playwright test gap-analysis-a4-a8.spec.js --workers=1
node scripts/check-page-data-wiring.mjs
```

No backend changes in this slice — full backend suite not re-run since
no backend file was touched (confirmed via `git status`).
