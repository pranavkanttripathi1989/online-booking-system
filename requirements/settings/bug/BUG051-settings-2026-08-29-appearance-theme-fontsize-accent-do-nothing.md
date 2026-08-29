---
id: BUG051
type: bug
feature: settings
created: 2026-08-29
updated: 2026-08-29
status: done
parent: BUG044
related: [PLAN219, TP239, TR239]
---

# BUG051 — Settings > Appearance's Font Size and Accent Color did nothing

## How it was found

User-reported via screenshot: on `/settings`'s Appearance tab, selecting
Theme=Light, Font Size=XL, and Accent Color=Red, then clicking "Save
Appearance", visibly changed nothing except (correctly) light/dark
mode.

## Root cause

- **Theme (Light/Dark/System) was already correctly wired** — the
  radio group reads/writes `useThemeMode()` directly (`BUG047`'s own
  fix). Not touched by this bug.
- **Font Size and Accent Color were 100% decorative.** Both were local
  `useState` in `settings/index.jsx`, each consumed only by their own
  control's cosmetic preview (an "Aa" font glyph; the swatch's own
  selection ring) — never passed into `theme/index.js`'s
  `createAppTheme()`, which took a single `mode` argument and hardcoded
  `primary.main` to one brand teal per mode.
- **A second, separate, reproducible bug**: `handleSaveAppearance()`
  did a bare `localStorage.setItem` overwrite (not a merge) against the
  exact same key `ThemeModeContext` uses to persist `themeMode` — so
  clicking "Save Appearance" after changing the theme could silently
  revert it to the default on next load.

## Scope redirect mid-implementation

The original plan (approved via plan mode) treated Font Size and
Accent Color as both becoming personal, per-device preferences (mirroring
`themeMode`'s own existing mechanism). Partway through implementation,
the user redirected: accent color should be "backend stored on the
basis of that organization setting," not per-device.

Investigation found a real, already-shipped, already-WCAG-AA-validated
mechanism for exactly this: `ClientOrganizations.primary_color`
(`REQ002`'s org-branding feature, `myOrgBranding`/`updateMyOrgBranding`
GraphQL, manager+-only write) — but it was **completely dead
visually**, fetched by `AppShell.jsx` and never actually applied to any
rendered element (not even the sidebar chrome it was fetched for).

Asked the user directly (`AskUserQuestion`) how the personal Accent
Color picker should relate to this real org setting; **"Replace it
with the org color" was selected** — remove the personal swatch
picker entirely, wire the org's real branding color into the actual
theme for the first time.

## Fix

- `theme/index.js`'s `createAppTheme(mode, options)` gains
  `{ accentColor, fontScale }` — a `buildPrimaryFromAccent()` helper
  overrides `palette.primary` (computed *before* the rest of the
  function's literals, since most component overrides bake in
  `p.primary.*` as build-time literals, not a live theme lookup); a
  `buildTypography(scale)` helper scales every variant, floor-clamped
  at 14px per `RES-6` (a real, in-scope side-fix: `body2`/`caption`
  already violated this floor at the default scale).
- New `frontend/src/theme/contrast.js` — a client-side WCAG helper
  mirroring `backend/src/common/utils/contrast.ts` exactly (separate
  packages, no shared workspace), used for the accent's `contrastText`
  selection.
- `context/ThemeContext.jsx`: `accentColor` is now read-only, sourced
  from a new minimal `myOrgBranding { primary_color }` query (falls
  back to the brand default for an org-less caller); `fontScale` is
  personal, per-device, instant-apply, clamped to
  `FONT_SCALE_PRESETS = [0.9, 1.0, 1.1, 1.25]`. The clobber bug is
  fixed at its root: `readStoredMode`/`writeStoredMode` generalized
  into a shared `readStoredField`/`writeStoredField` merge-safe pair,
  reused by every field sharing the one localStorage key.
- `settings/index.jsx`: removed the `ACCENT_COLORS` swatch array and
  `accent`/`setAccent` local state entirely; the Accent Color section
  is now a read-only display of the org's real color with a "Change in
  Branding →" link (managers+ only, jumping to the existing Branding
  tab). Font Size slider now drives `fontScale` via
  `FONT_SCALE_PRESETS`, applying instantly. `handleSaveAppearance` now
  read-modify-writes instead of overwriting, and its payload shrank to
  just `{ compact, rtl }`.

## Verification

Backend: n/a (no backend change — reused `REQ002`'s existing,
already-tested mutation/validation as-is). Frontend: `tsc`/`eslint`
clean; `theme/index.test.js` (8/8), `theme/contrast.test.js` (5/5),
`ThemeContext.test.jsx` (9/9), `settings/index.test.jsx` (10/10,
including a rewritten clobber-bug regression case); `npm run build` +
`npm run size` green.

**Live-verified** (Chrome DevTools MCP, real dev stack,
`clinician@medibook.dev`): Font Size XL genuinely scaled all rendered
typography app-wide instantly, no Save needed, and persisted across a
full reload; Accent Color correctly showed the org's real branding
color (`#006D77`, this org's unset default) with no "Change in
Branding" link for a non-manager clinician (correct role gate); Dark
theme + XL font size both survived a real "Save Appearance" click
followed by a full page reload — the exact clobber-bug regression
scenario, now fixed.
