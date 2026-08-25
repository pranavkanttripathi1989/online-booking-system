---
id: TP135
type: improvement
feature: organization-branding
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN108
related: [REQ077]
---

# TP135 — Test plan for the `no-hardcoded-colors` ratchet (F-19)

| # | Case | Expected |
|---|---|---|
| 1 | `npm run lint` | Exits 0 at the new 1951-warning ceiling |
| 2 | A file under `pages/`/`components/`/`layouts/` with a hex literal | Flagged `warn` |
| 3 | `theme/theme.js` | Not flagged |

## Run

```
cd frontend && npm run lint
```
