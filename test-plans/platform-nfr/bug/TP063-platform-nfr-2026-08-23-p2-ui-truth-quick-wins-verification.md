---
id: TP063
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: BUG015
related: [PLAN036, TR062]
---

# TP063 — Verification for the P2 UI-truth quick wins

## Per-item contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | `npx eslint` on all 4 touched files | 0 errors; any warnings pre-exist the change (confirmed via `git diff` on the warned lines) |
| TC-02 | Repo-wide grep for `<Table` without a `TableContainer` sibling | 0 remaining matches (was exactly 3) |
| TC-03 | Repo-wide grep for `GlobalSearch` | 0 matches (file deleted) |
| TC-04 | Repo-wide grep for `Backend offline` / `using mock data` in `apollo/client.js` | 0 matches |
| TC-05 | `RecentAppointmentsTable` with an empty `appointments` array | Renders "No upcoming appointments.", not fabricated rows |

## How this was checked

TC-01/02/03/04 via direct `eslint`/`grep`. TC-05 via code review of the
new conditional (`rows.length === 0` branch) — no dedicated unit test
exists for this component yet; a live browser pass is reasonable follow-up
but not required for a change this mechanical and low-risk.
