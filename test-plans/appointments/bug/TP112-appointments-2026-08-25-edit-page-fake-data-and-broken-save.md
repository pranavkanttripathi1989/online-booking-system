---
id: TP112
type: bug
feature: appointments
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN085
related: [BUG023]
---

# TP112 — Test plan for the `appointments/edit.jsx` fix

## Frontend unit — `frontend/src/pages/appointments/edit.test.jsx` (new)

| # | Case | Expected |
|---|---|---|
| 1 | Real fetched appointment data | Real patient/clinician names render; never the fabricated `mocks/store` names |
| 2 | Empty clinicians/rooms result | Only "No clinician" appears in the opened Select's option list — no fabricated MockStore rows |
| 3 | `appointment: null`, no error (genuine not-found) | Real "This appointment could not be found." state, not an infinite skeleton |
| 4 | A real `Appointment not found` GraphQL error | Same real not-found state — not the degraded MockStore fallback |
| 5 | A full save round trip | The mutation mock only matches (and thus the save only "succeeds" in the test) when its variables **exclude** `end_datetime` — the direct regression guard for defect #5 |
| 6 | End Date & Time field | Rendered `disabled` |
| 7 | A genuine non-not-found query error (e.g. network down) | Falls back to MockStore's degraded mode, not a crash — pre-existing, documented behavior, unchanged |

## e2e — `frontend/e2e/appointments-edit.spec.js` (new), against the real backend

| # | Scenario | Assertion |
|---|---|---|
| 1 | Load `/appointments/:id/edit` for a real fixture appointment | Real patient name visible; no fabricated mock name |
| 2 | Edit the Notes field and click Save Changes | Navigates to the appointment detail page (real success); reloading the edit page shows the new note text — proves the save actually persisted, the exact path defect #5 silently broke before this fix |
| 3 | Navigate to `/appointments/<a real but nonexistent uuid>/edit` | Real not-found state, not an infinite skeleton |

## Full-suite gate before commit (Hard Rule 3)

```
cd frontend && npm run lint && npm test && npm run build
npx playwright test appointments-edit.spec.js
node scripts/check-page-data-wiring.mjs
```

No backend changes in this slice.
