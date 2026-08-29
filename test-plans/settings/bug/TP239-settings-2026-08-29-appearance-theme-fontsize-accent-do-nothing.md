---
id: TP239
type: bug
feature: settings
created: 2026-08-29
updated: 2026-08-29
status: approved
parent: PLAN219
related: [TR239]
---

# TP239 — Settings > Appearance's Font Size and Accent Color did nothing — test plan

## Cases

1. **`createAppTheme` defaults to brand teal** when no `accentColor` is
   given, in both light and dark modes.
2. **A custom `accentColor` applies to `palette.primary`** in both
   modes.
3. **Nav-selected/table-head styling derives from the custom accent**,
   not just `palette.primary` in isolation (regression guard for the
   light-mode branches that used to be hardcoded literals).
4. **`contrastText` is picked correctly** for a light accent (dark
   text) vs. a dark accent (light text).
5. **Typography is unchanged at the default `fontScale` of 1**, scales
   up at `1.25`, and floor-clamps `body2`/`caption` at 14px even when
   scaled down (`RES-6`).
6. **`ThemeModeContext` exposes `accentColor`** sourced from the real
   `myOrgBranding.primary_color` query, falling back to `null` for an
   org-less caller.
7. **`setFontScale` applies instantly and persists** without
   clobbering a stored `themeMode`; an out-of-range value clamps to
   the default; a previously-saved value reloads correctly.
8. **`handleSaveAppearance` merges into existing localStorage prefs**
   rather than clobbering a `themeMode` `ThemeModeContext` already
   wrote — the exact case that would have caught the original bug.
9. **`fontSize`/`accent` are no longer written to localStorage at
   all.**
10. **Accent Color renders as a read-only organization setting**, not
    a clickable personal swatch picker, with a "Change in Branding"
    link visible only to manager+ roles.
11. **Live**: Font Size XL scales real rendered typography app-wide
    instantly; Dark theme + XL font size both survive a real "Save
    Appearance" click and a full page reload.

## Out of scope

Testing the org's Branding color picker itself (its own WCAG
validation, save flow) — unchanged, already covered by its own
existing tests; this slice only wires its *output* into the theme for
the first time.
