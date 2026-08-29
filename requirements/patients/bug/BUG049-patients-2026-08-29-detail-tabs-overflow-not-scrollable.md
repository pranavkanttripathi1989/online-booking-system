---
id: BUG049
type: bug
feature: patients
created: 2026-08-29
updated: 2026-08-29
status: done
parent: null
related: [PLAN216, TP236, TR236]
---

# BUG049 — patient detail tabs overflow with no scroll affordance

## How it was found

User-reported via screenshot: on `pages/patients/detail.jsx`, the tab
row (Overview / Medical History / Appointments / Test Results /
Documents / Intake Form / Letters / Communication Log / Insurance /
Packages — 10 tabs total) overflowed the card width at a tablet-class
viewport, and the tail end (starting around "Communication Log") was
silently clipped with **no horizontal scroll affordance at all** — a
direct `RES-3` violation ("No horizontal scrolling on the page body.
Ever. Wide content ... scrolls inside its own `overflow-x: auto`
container with a visible affordance").

## Root cause

`frontend/src/pages/patients/detail.jsx`'s `<Tabs>` (around line 1139)
used MUI's default `variant="standard"` with no `scrollButtons` — this
renders the 10 `<Tab>` children as a plain flex row with no scroll
container. Combined with the immediate parent `<Paper>`'s
`overflow: 'hidden'` (for its rounded corners), any tab beyond the
visible width was clipped outright rather than scrolled to.

## Fix

Added `variant="scrollable"`, `scrollButtons="auto"`, and
`allowScrollButtonsMobile` to the `<Tabs>` element. This is MUI's own
built-in scroll-container mechanism — it wraps the tab list in an
internal scroller (bounded correctly by the parent `Paper`'s
`overflow: hidden`, which only clips the outer box, not the Tabs'
own internal scroll) and renders left/right chevron buttons whenever
content overflows.

## Verification

- `npx eslint src/pages/patients/detail.jsx` — clean (0 errors).
- `npx jest src/pages/patients/detail.test.jsx` — 8/8 green, unmodified.
- **Live-verified** (Chrome DevTools MCP, real dev stack, logged in as
  `manager@medibook.dev`, real patient "John Michael Doe", 1024px
  viewport matching the reported screenshot): before the fix, no
  scroll affordance existed and the row silently clipped; after, a
  right-chevron scroll button appears, all 10 tabs are present as
  real `tab` elements in the accessibility tree (not just visually,
  confirmed via `take_snapshot`), and clicking the previously-hidden
  "Packages (0)" tab correctly scrolls it into view, selects it, and
  renders its real (empty-state) content.
