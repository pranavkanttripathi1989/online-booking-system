---
id: TP227
type: bug
feature: platform-nfr
created: 2026-08-28
updated: 2026-08-28
status: approved
parent: PLAN207
related: [BUG031, BUG033]
---

# TP227 — Test plan for PLAN207

| # | Case | Expected |
|---|---|---|
| 1 | A11y snapshot on `/admin/communications` | Every Preview/Edit button reports a real accessible name |
| 2 | A11y snapshot on `/admin/languages` | Edit/Delete buttons named; the disabled default-language Delete names the real reason |
| 3 | `/admin/plans` as `admin@medibook.dev` (not `super_admin`) | Real "doesn't have super_admin access" alert renders |
| 4 | Same page | "New Plan" button absent, not just disabled |
| 5 | `npx eslint` on all 9 touched files | Clean |
