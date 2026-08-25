---
id: TP117
type: improvement
feature: platform-integrations
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN090
related: [REQ063]
---

# TP117 — Test plan for the webhook delivery log UI

## Frontend unit — `frontend/src/pages/settings/index.test.jsx` (new)

| # | Case | Expected |
|---|---|---|
| 1 | A webhook with no deliveries | Real empty state shown in the Delivery Log dialog |
| 2 | A webhook with real delivery attempts, including a failed one | Event type, status (including `failed`), and details all render inside the dialog |

## e2e — `frontend/e2e/gap-analysis-a4-a8.spec.js` (shared A-4–A-8 fixture file, new)

| # | Scenario | Assertion |
|---|---|---|
| 1 | Manager creates a real webhook endpoint against a deliberately unreachable URL, a real `appointment.created` event fires, then the manager opens its Delivery Log | The real attempt appears with `event_type: 'appointment.created'` and `status: 'failed'` — not swallowed, not fabricated |

## Full-suite gate before commit (Hard Rule 3)

```
cd frontend && npm run lint && npm test -- --runInBand && npm run build
npx playwright test gap-analysis-a4-a8.spec.js --workers=1
node scripts/check-page-data-wiring.mjs
```

No backend changes in this slice — full backend suite not re-run since
no backend file was touched (confirmed via `git status`).
