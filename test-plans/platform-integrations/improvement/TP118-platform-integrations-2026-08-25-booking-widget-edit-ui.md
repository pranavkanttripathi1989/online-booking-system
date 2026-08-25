---
id: TP118
type: improvement
feature: platform-integrations
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN091
related: [REQ064]
---

# TP118 — Test plan for the booking widget edit UI

## Frontend unit — `frontend/src/pages/settings/index.test.jsx` (extended)

| # | Case | Expected |
|---|---|---|
| 1 | Editing a widget's allowed origins | Real `updateBookingWidgetConfig` mutation fires with `{id, input: {allowed_origins}}` (no `short_link_slug` sent); the row shows the new origins and the same slug after refetch |

## e2e — `frontend/e2e/gap-analysis-a4-a9.spec.js` (extended, shared A-4–A-9 fixture file)

| # | Scenario | Assertion |
|---|---|---|
| 1 | Manager creates a real widget config, edits its origins through the UI | The real mutation response is OK with no GraphQL errors; the new origin appears in the row; the original embed slug is still visible, proving it wasn't regenerated |

## Full-suite gate before commit (Hard Rule 3)

```
cd frontend && npm run lint && npm test -- --runInBand && npm run build
npx playwright test gap-analysis-a4-a9.spec.js --workers=1
node scripts/check-page-data-wiring.mjs
```

No backend changes in this slice — full backend suite not re-run since
no backend file was touched (confirmed via `git status`).
