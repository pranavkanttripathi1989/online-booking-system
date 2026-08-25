---
id: PLAN108
type: improvement
feature: organization-branding
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ077
related: []
---

# PLAN108 — Implementation plan for the `no-hardcoded-colors` ratchet (F-19)

Two files, no new dependency.

## Changes

**`frontend/eslint.config.js`**: new config block, `files: ['src/pages/
**/*.{js,jsx}', 'src/components/**/*.{js,jsx}', 'src/layouts/**/*.{js,
jsx}']`, `'no-restricted-syntax': ['warn', {selector:
"Literal[value=/^#([0-9a-fA-F]{3}){1,2}$/]", message: '...'}]`.

**`frontend/package.json`**: `"lint"` script's `--max-warnings` raised
from `169` to `1951` (the real, measured total after adding the rule).

## Testing

`npm run lint` exit code — was failing (exit 1, "too many warnings") at
the old ceiling with the new rule active; passes (exit 0) at the new
ceiling. No unit test applicable (a lint config change).

## Live verification

`npm run lint` run twice: once to measure the real new-rule warning
count (1951), once after raising the ceiling to confirm the gate passes
again.
