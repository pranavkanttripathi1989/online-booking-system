---
id: REQ076
type: improvement
feature: repo-hygiene
created: 2026-08-26
updated: 2026-08-26
status: done
parent: null
related: []
---

# REQ076 — Repository root cleanup

## Source

`project-plans/02-findings-register.md` F-31, part of a 10-finding
pick-up. Re-verified all named items still present before starting.

## What shipped

- Moved 5 pre-pivot planning artifacts (`plan-new.md`,
  `medibook-ui-plan-v5-complete.txt`, `medibook-dashboard-ui-plan.txt`,
  `healthsync-plan.html`, `HEALTHSYNC_FRONTEND_PLAN.md` — all dated
  March 2026, before the actual Node/NestJS/Postgres pivot) into
  `context/archive/pre-pivot-planning-docs/`, via `git mv` to preserve
  history, with a README explaining what they are and why they moved.
- Deleted `Makefile` (targets the abandoned Laravel/MySQL/PHP-FPM/Nginx
  stack, already flagged dead in `CLAUDE.md`'s own standing warning) and
  `FRONTEND_PLAN.md` (11 bytes of garbage content — `sawaAAAAW!`,
  confirmed not real).
- Left `Working-with-Claude-Code.pptx` in place — not a planning
  document, out of this finding's scope; flagged rather than guessed at.

## What was already closed, re-confirmed rather than re-done

`.playwright-mcp/` is already `.gitignore`d. The three
`backend/.env.bak*` files are already covered (`*.bak` and
`backend/.env.*` patterns, both pre-existing) — confirmed via `git
check-ignore -v` that none of the three is tracked. No `.gitignore`
change was needed for either.

## A correction to the finding's own prescribed fix

The finding's text said to move the docs "where the archive-sweep
script can manage them" (`scripts/archive-sweep.mjs`). That script only
manages `context/<feature>-<date>/` bundles carrying the five-root
frontmatter contract — it has no mechanism for loose files like these
five. They were moved to `context/archive/` anyway (the right general
location), but as a one-time manual move with its own README, not
something the sweep script will ever touch again on its own. Recorded
so nobody expects the sweep script to manage this subdirectory later.

## Traceability

`project-plans/02-findings-register.md` F-31.
