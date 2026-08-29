---
id: PLAN219
type: bug
feature: settings
created: 2026-08-29
updated: 2026-08-29
status: done
parent: BUG051
related: [TP239, TR239]
---

# PLAN219 — Settings > Appearance's Font Size and Accent Color did nothing

## Approach

1. Investigated the real code (`settings/index.jsx`, `ThemeContext.jsx`,
   `theme/index.js`, `main.jsx`) via a dedicated Explore pass before
   any edit — confirmed Theme was already correctly wired, Font
   Size/Accent Color were fully decorative, and found the separate
   localStorage-clobber bug by reading both files' writes to the same
   key side by side.
2. Entered plan mode; a Plan agent validated the exact code shape
   (`createAppTheme`'s literal-vs-dynamic component overrides, the
   RES-6 floor violation already present at default scale, the
   backend contrast helper to mirror). Plan approved.
3. Implemented `theme/contrast.js`, `theme/index.js`'s
   `{accentColor, fontScale}` extension, and `ThemeContext.jsx`'s
   personal-per-device `accentColor` field — then the user redirected
   mid-implementation: accent should be org-backend-stored.
4. A second Explore pass found `REQ002`'s existing, real, WCAG-validated
   org branding color (`myOrgBranding.primary_color`) — confirmed via
   grep that it reaches nothing visual today (AppShell fetches it,
   never applies it). Asked the user directly (`AskUserQuestion`)
   how the personal picker should relate to it; "replace it" was
   chosen.
5. Reworked `ThemeContext.jsx`: removed the personal `accentColor`
   setter/localStorage field entirely, added a minimal
   `myOrgBranding { primary_color }` query, `accentColor` is now
   purely a read-through of the org's real setting. `fontScale`
   unaffected by the redirect — stays personal/per-device.
6. Reworked `settings/index.jsx`: removed `ACCENT_COLORS`/`accent`/
   `setAccent` entirely; Accent Color section becomes a read-only
   display + manager-only "Change in Branding" link; Font Size wired
   to `useThemeMode().setFontScale`; `handleSaveAppearance` fixed to
   merge (read-modify-write) instead of overwrite, payload reduced to
   `{compact, rtl}`.
7. Removed the now-stale `contrast.test.js` case that referenced the
   deleted `ACCENT_COLORS` array.

## Testing

- `npx eslint`/`npx tsc --noEmit`-equivalent (JS, no TypeScript) —
  clean across all touched files.
- `theme/index.test.js` (new, 8 cases): default brand primary, custom
  accentColor applied in both modes, nav/table-head styling derives
  from the accent, contrastText picked correctly for light vs. dark
  accents, typography unchanged at scale 1, scales up at 1.25, floor-
  clamps at 14px, never throws with no options.
- `theme/contrast.test.js` (5 cases, mirrors the backend spec exactly).
- `context/ThemeContext.test.jsx` (9 cases): the 4 pre-existing
  `BUG047` cases (all still pass, one mock added for the new
  unconditional org-branding query) + new accentColor/fontScale
  coverage.
- `pages/settings/index.test.jsx` (10 cases): the merge-safety
  regression case (seeds a prior `themeMode`, saves, asserts it
  survives), a case confirming `fontSize`/`accent` are no longer
  written at all, and a case confirming the read-only Accent Color
  display.
- `npm run build` + `npm run size` — green.
- Live Chrome DevTools MCP verification against the real dev stack
  (see `TR239` for the full account).

## Commit

Code commit: `frontend/src/theme/index.js`,
`frontend/src/theme/contrast.js`+`.test.js`,
`frontend/src/theme/index.test.js`,
`frontend/src/context/ThemeContext.jsx`+`.test.jsx`,
`frontend/src/pages/settings/index.jsx`+`.test.jsx`. Docs commit
separately.
