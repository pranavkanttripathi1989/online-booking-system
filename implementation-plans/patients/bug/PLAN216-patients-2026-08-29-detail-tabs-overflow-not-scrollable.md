---
id: PLAN216
type: bug
feature: patients
created: 2026-08-29
updated: 2026-08-29
status: done
parent: BUG049
related: [TP236, TR236]
---

# PLAN216 — patient detail tabs overflow with no scroll affordance

## Approach

1. Located the exact `<Tabs>` element via a targeted `Explore` pass
   (not from memory) — `frontend/src/pages/patients/detail.jsx:1139`,
   confirmed it had no `variant`/`scrollButtons` props and its parent
   `<Paper>` had `overflow: 'hidden'`.
2. Added `variant="scrollable"`, `scrollButtons="auto"`,
   `allowScrollButtonsMobile` — the standard MUI fix for exactly this
   overflow class, matching the same "wide content scrolls inside its
   own container with a visible affordance" pattern this codebase
   already applies via `<TableContainer>` for tables (`RES-3`).
3. No change needed to the parent `Paper`'s `overflow: hidden` —
   MUI's scrollable-Tabs variant manages its own internal scroll
   region within the Tabs' own box, so it doesn't conflict with the
   outer container's corner-clipping.

## Testing

- `npx eslint src/pages/patients/detail.jsx` — 0 errors.
- `npx jest src/pages/patients/detail.test.jsx` — 8/8 green.
- Live verification via Chrome DevTools MCP against the real dev
  stack (see `TR236` for the full account) — confirmed both visually
  (screenshot) and structurally (accessibility-tree snapshot showing
  all 10 tabs as real, clickable elements) rather than assuming the
  standard MUI props alone were sufficient.

## Commit

One commit, `frontend/src/pages/patients/detail.jsx` only.
