---
id: TP136
type: improvement
feature: frontend-platform
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN109
related: [REQ078]
---

# TP136 — Test plan for the `cache-and-network` check (F-21)

| # | Page | Expected |
|---|---|---|
| 1 | `pages/queue/index.jsx` (`QUEUE_BOARD_QUERY`) | `fetchPolicy: 'cache-and-network'` present |
| 2 | `pages/appointments/index.jsx` (`APPOINTMENTS_QUERY`) | `fetchPolicy: 'cache-and-network'` present |
| 3 | `pages/calendar/index.jsx` (`APPOINTMENTS_QUERY`) | `fetchPolicy: 'cache-and-network'` present |
| 4 | `pages/dashboard/index.jsx` (`DASHBOARD_QUERY`) | `fetchPolicy: 'cache-and-network'` present |
