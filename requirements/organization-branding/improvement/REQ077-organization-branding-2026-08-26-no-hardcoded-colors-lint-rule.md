---
id: REQ077
type: improvement
feature: organization-branding
created: 2026-08-26
updated: 2026-08-26
status: done
parent: null
related: []
---

# REQ077 — `no-hardcoded-colors` ESLint rule (ratchet only)

## Source

`project-plans/02-findings-register.md` F-19, part of a 10-finding
pick-up. Re-verified: 90 of 122 files under `pages/`/`components/`/
`layouts/` still hardcode hex colors, essentially unchanged since
2026-08-22 — `CLAUDE.md`'s own Hard Rule 5 has been a documented rule
with zero enforcement the entire time.

## Deliberately scoped down

The full mechanical sweep (converting 90 files' hex literals to theme
tokens) is its own dedicated, much larger slice — not attempted here.
This adds only the **ratchet**: a lint rule that makes the debt visible
and stops it from growing silently, matching the existing
`no-autofocus`/`media-has-caption` "warn, don't block, document why"
precedent already in `eslint.config.js`.

## What shipped

New `no-restricted-syntax` rule (`warn`) matching any string literal
whose value looks like a hex color (`/^#([0-9a-fA-F]{3}){1,2}$/`),
scoped to a new config block covering exactly `src/pages/**`,
`src/components/**`, `src/layouts/**` — the same three directories Hard
Rule 5 names. Deliberately **not** applied to the whole `src/` tree:
`theme/theme.js` is the legitimate source of truth for these hex values
and must keep using literals.

Firing the rule for the first time surfaced **1951 warnings** (0
errors) — a real number, not an estimate, and the actual scale of the
debt this codebase has been carrying silently. `package.json`'s
`--max-warnings` ratchet raised from 169 to 1951 in the same change, so
the lint gate keeps passing but the ceiling now reflects reality — it
can only go down from here, the same convention `F-22`'s own 197-warning
ratchet already established for this project.

## Acceptance criteria (Given/When/Then)

- **Given** a file under `pages/`/`components/`/`layouts/` with a
  literal hex color, **when** `npm run lint` runs, **then** it's
  flagged as a warning, not an error.
- **Given** `theme/theme.js`, **then** it is not flagged — it's outside
  the three scoped directories.
- **Given** the current 1951-warning baseline, **then** `npm run lint`
  passes; any future PR that adds a 1952nd warning across the whole
  suite fails it.

## Traceability

`project-plans/02-findings-register.md` F-19.
