# Pre-pivot planning documents

Five large planning artifacts from March 2026, before the actual build
pivoted to Node/NestJS/Postgres (the stack described everywhere else in
this repo today). Moved here from the repo root 2026-08-25 as part of
`F-31` (`project-plans/02-findings-register.md`) — they were dead weight
at the root, not referenced by any current build, script, or doc, and
`scripts/archive-sweep.mjs` doesn't manage loose files like these (it only
manages `context/<feature>-<date>/` bundles with frontmatter), so this is
a manual, one-time move rather than something the sweep script will ever
touch again on its own.

- `plan-new.md`
- `medibook-ui-plan-v5-complete.txt`
- `medibook-dashboard-ui-plan.txt`
- `healthsync-plan.html`
- `HEALTHSYNC_FRONTEND_PLAN.md`

Kept for historical reference only — none of these describe the current
architecture.
