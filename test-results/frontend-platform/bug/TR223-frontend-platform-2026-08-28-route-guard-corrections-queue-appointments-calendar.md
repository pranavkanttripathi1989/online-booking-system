---
id: TR223
type: bug
feature: frontend-platform
created: 2026-08-28
updated: 2026-08-28
status: pass
parent: TP223
related: [BUG039, BUG046, PLAN203]
---

# TR223 — Results for PLAN203 (route-guard corrections)

Executed 2026-08-28 against `medibook_backend`/`medibook_frontend`
(dev stack) via Chrome DevTools MCP.

| # | Case | Result |
|---|---|---|
| 1 | Staff → Live Queue | Pass — real Live Queue page loaded, no 403 |
| 2 | Patient → `/appointments` | Pass — 403 "Your role (patient) does not have access to /appointments" |
| 3 | Patient → `/calendar` | Pass — 403 "Your role (patient) does not have access to /calendar" |
| 4 | Staff → Appointments (sidebar) | Pass — "103 upcoming appointments" list rendered correctly |
| 5 | Staff → Dashboard, unaffected | Pass — staff dashboard rendered identically to before the change |
| 6 | `npx eslint src/App.jsx` | Pass — clean |

6/6 pass. `BUG039` and `BUG046` both marked `done`.
