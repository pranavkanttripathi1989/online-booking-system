---
id: TP134
type: improvement
feature: repo-hygiene
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN107
related: [REQ076]
---

# TP134 — Test plan for repo root cleanup (F-31)

| # | Case | Expected |
|---|---|---|
| 1 | Repo root | 5 planning docs, `Makefile`, `FRONTEND_PLAN.md` gone |
| 2 | `context/archive/pre-pivot-planning-docs/` | Contains the 5 moved docs + README |
| 3 | `.playwright-mcp/`, `backend/.env.bak*` | Confirmed already `git check-ignore`d |
| 4 | `git log` on a moved file | History preserved (`git mv`, not delete+recreate) |
