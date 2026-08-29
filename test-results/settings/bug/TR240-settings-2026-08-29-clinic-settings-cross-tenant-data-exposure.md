---
id: TR240
type: bug
feature: settings
created: 2026-08-29
updated: 2026-08-29
status: done
parent: TP240
related: []
---

# TR240 — Clinic Settings cross-tenant data exposure — results

## Outcome: PASS

| Case (from `TP240`) | Result |
|---|---|
| 1. Org-less admin sees "no organisation", no query fires | ✅ new regression test, `settings/index.test.jsx` |
| 2. No cross-tenant data anywhere on the page | ✅ confirmed both in the test and live |
| 3. Legitimate org-scoped caller still works | ✅ new regression test + live verification |
| 4. Live verification | ✅ see below |

Full suite: `settings/index.test.jsx` 12/12 (10 pre-existing + 2 new).
`npx eslint` clean.

## Live verification

Chrome DevTools MCP, real dev stack:
- Logged in as `admin@medibook.dev` (real `client_org_id: null`,
  confirmed via seed data). Navigated to `/settings` → Clinic tab:
  **both** "Clinic Information" and "Branding" now correctly show
  "Your account isn't associated with an organisation..." — no longer
  disagreeing. Confirmed via `document.body.innerText` that neither
  "MG Road" nor "City Heart" (the foreign tenant's clinic/org names)
  appear anywhere on the page.
- Logged in as `manager@medibook.dev` (a real member of "City Heart
  Clinic Group"). Navigated to `/settings` → Clinic tab: correctly
  loaded and displayed her own real clinic ("MG Road Clinic", the same
  data the org-less admin used to see — now correctly gated to only
  the account that actually owns it).

## Verdict

Ships as `done`.
