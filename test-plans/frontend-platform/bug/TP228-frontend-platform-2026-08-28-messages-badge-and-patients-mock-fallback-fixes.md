---
id: TP228
type: bug
feature: frontend-platform
created: 2026-08-28
updated: 2026-08-28
status: approved
parent: PLAN208
related: [BUG041, BUG043]
---

# TP228 — Test plan for PLAN208

| # | Case | Expected |
|---|---|---|
| 1 | `/messages` sidebar badge, `admin@medibook.dev` | Real thread-based count, not a fabricated "3" |
| 2 | `/patients` with real data | Real patient count/rows still render correctly |
| 3 | `/patients`, search matching no real patient | Real "No patients match ..." empty state, not the mock list |
| 4 | `npx eslint` on both touched files | Clean |
