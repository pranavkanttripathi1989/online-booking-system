---
id: TR225
type: bug
feature: platform-nfr
created: 2026-08-28
updated: 2026-08-28
status: pass
parent: TP225
related: [BUG030, BUG034, BUG037, PLAN205]
---

# TR225 — Results for PLAN205

Executed 2026-08-28/29 against the real dev stack via Chrome DevTools
MCP, plus a direct `psql` check and the frontend unit suite.

| # | Case | Result |
|---|---|---|
| 1–3 | `formatPercent` unit tests | Pass |
| 4 | `/admin/policies` DPDP text | Pass — "DPDP & Compliance" tab, "Booking rules, security settings, and DPDP compliance" subtitle, DPDP Act 2023 banner and retention text, "Right to Erasure" (no article number) |
| 5 | `/login` feature list | Pass — "Secure and private — DPDP compliant" |
| 6 | `/manager/dashboard` percentages | Pass — "2.6%" / "66.7%", cleanly rounded |
| 7 | `/manager/rooms` display | Pass — "Room 3A" / "Room 5B", "Consultation Room" under each |
| 8 | `psql` post-migration check | Pass — both `Rooms.room_type` values are the real `room_types.id` `93a9efdc-ff38-4644-9c9d-e88ad6e5935e` |
| 9 | Lint / unit suite | Pass — 0 new eslint errors, 34/34 `dateTime.test.js` |

9/9 pass. `BUG030`, `BUG034`, `BUG037` all marked `done`.
