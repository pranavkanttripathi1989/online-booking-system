---
id: PLAN107
type: improvement
feature: repo-hygiene
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ076
related: []
---

# PLAN107 — Implementation plan for repo root cleanup (F-31)

Pure file moves/deletes, no code. `git mv` for the 5 planning docs into
a new `context/archive/pre-pivot-planning-docs/` directory (with a
README), `git rm` for `Makefile` and `FRONTEND_PLAN.md`. Verified
`.playwright-mcp/` and `backend/.env.bak*` are already correctly
ignored via `git check-ignore -v` — no `.gitignore` change needed.

## Testing

None applicable — no code changed. Confirmed the repo still builds/
lints/tests cleanly (covered by this batch's own consolidated
verification pass, not a separate run).
