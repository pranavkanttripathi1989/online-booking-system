---
id: CTX-settings-2026-08-29-bug051
type: bug
feature: settings
created: 2026-08-29
updated: 2026-08-29
status: done
parent: BUG051
related: [PLAN219, TP239, TR239]
---

# settings — Appearance's Font Size/Accent Color did nothing (2026-08-29)

User-reported via screenshot: Theme/Font Size/Accent Color controls on
`/settings`'s Appearance tab didn't visibly do anything when changed.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG051 | [Appearance controls did nothing](../../requirements/settings/bug/BUG051-settings-2026-08-29-appearance-theme-fontsize-accent-do-nothing.md) |
| implementation-plans | PLAN219 | [implementation plan](../../implementation-plans/settings/bug/PLAN219-settings-2026-08-29-appearance-theme-fontsize-accent-do-nothing.md) |
| test-plans | TP239 | [test plan](../../test-plans/settings/bug/TP239-settings-2026-08-29-appearance-theme-fontsize-accent-do-nothing.md) |
| test-results | TR239 | [results](../../test-results/settings/bug/TR239-settings-2026-08-29-appearance-theme-fontsize-accent-do-nothing.md) |

## What shipped

Font Size and Accent Color were both fully decorative (local
`useState`, never reaching the real MUI theme); `handleSaveAppearance`
also had a separate, real bug — a bare localStorage overwrite that
could silently clobber the shared `themeMode` field.

`theme/index.js`'s `createAppTheme(mode, {accentColor, fontScale})`
now really applies both. Font Size stays personal/per-device
(`ThemeModeContext`, instant-apply). **Accent Color's scope changed
mid-implementation**: the user redirected it to be organization-backed
rather than personal — investigation found a real, already-shipped,
already-WCAG-validated org branding color (`REQ002`) that was
completely dead visually (fetched by `AppShell`, never applied
anywhere). Confirmed via `AskUserQuestion` to replace the personal
picker with this real org setting rather than keep two competing
mechanisms. The Appearance tab's Accent Color section is now a
read-only display of the org's real color, with a manager-only
"Change in Branding" link.

## Verification

`theme/index.test.js` 8/8, `theme/contrast.test.js` 5/5,
`ThemeContext.test.jsx` 9/9, `settings/index.test.jsx` 10/10. `npm run
build`/`size` green. **Live-verified** via Chrome DevTools MCP: Font
Size XL genuinely scales all typography app-wide instantly; Dark theme
+ XL font size both survive a real Save Appearance click and full page
reload (confirming the clobber-bug fix); Accent Color correctly shows
the org's real branding color with the role-gated Branding link.
