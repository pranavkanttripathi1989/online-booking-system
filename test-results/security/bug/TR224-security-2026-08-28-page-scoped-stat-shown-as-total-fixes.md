---
id: TR224
type: bug
feature: security
created: 2026-08-28
updated: 2026-08-28
status: pass
parent: TP224
related: [BUG029, BUG036, BUG038, PLAN204]
---

# TR224 — Results for PLAN204

Executed 2026-08-28/29 against `medibook_backend`/`medibook_frontend`
(dev stack) via Chrome DevTools MCP, plus the backend unit suite.

| # | Case | Result |
|---|---|---|
| 1 | `getUsersStats` real counts | Pass |
| 2 | `getUsersStats` mirrors filters | Pass |
| 3 | `getUsersStats` org-less sentinel | Pass |
| 4 | `getAuditLogsCount` mirrors filters | Pass |
| 5 | Users Directory paging, `admin@medibook.dev` | Pass — page 1 "Showing 8 of 12 users" / "1–8 of 12", page 2 "Showing 4 of 12" / "9–12 of 12" with "Next" correctly disabled |
| 6 | Audit Logs pagination | Pass — "1–8 of 1225", "Next" enabled |
| 7 | `manager/clinics` rooms count | Pass — header "4 clinics · 2 rooms total" (was "0 rooms total"), MG Road Clinic card "2 Rooms" (was 0) |
| 8 | `clinician/Patients.jsx` label | Pass — "With Upcoming (this page)" |
| 9 | `npx tsc --noEmit` / `npx eslint` | Pass — clean |
| 10 | Backend unit suite, `src/users` | Pass — 64/64 (`users.service.spec.ts` 44/44, `users.resolver.spec.ts` 20/20) |

10/10 pass. `BUG029`, `BUG036`, `BUG038` all marked `done`.
