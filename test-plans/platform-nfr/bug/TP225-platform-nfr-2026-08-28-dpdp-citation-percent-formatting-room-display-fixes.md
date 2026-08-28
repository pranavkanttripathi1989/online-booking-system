---
id: TP225
type: bug
feature: platform-nfr
created: 2026-08-28
updated: 2026-08-28
status: approved
parent: PLAN205
related: [BUG030, BUG034, BUG037]
---

# TP225 — Test plan for PLAN205

| # | Case | Expected |
|---|---|---|
| 1 | `formatPercent` rounds a long raw float | 1 decimal by default |
| 2 | `formatPercent` honours an explicit decimal count | Correct precision |
| 3 | `formatPercent` defaults a missing value | "0.0%", not NaN/undefined |
| 4 | `/admin/policies` as `admin@medibook.dev` | Tab label, subtitle, banner, retention text, erasure title all say DPDP, not GDPR |
| 5 | `/login` (logged out) | Feature list reads "DPDP compliant" |
| 6 | `/manager/dashboard` as `admin@medibook.dev` | Clinician Utilization / Cancellation Rate show rounded percentages |
| 7 | `/manager/rooms` as `admin@medibook.dev` | Both real rooms show "Room 3A"/"Room 5B" (not doubled) and "Consultation Room" (not the raw code) |
| 8 | Direct `psql` check of `Rooms.room_type` post-migration | Both rows hold the real `room_types.id`, not the literal string |
| 9 | `npx eslint` (4 touched frontend files), `npx jest src/utils/dateTime.test.js` | Clean / 34/34 pass |
