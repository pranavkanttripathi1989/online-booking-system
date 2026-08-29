---
id: TR239
type: bug
feature: settings
created: 2026-08-29
updated: 2026-08-29
status: done
parent: TP239
related: []
---

# TR239 — Settings > Appearance's Font Size and Accent Color did nothing — results

## Outcome: PASS

| Case (from `TP239`) | Result |
|---|---|
| 1–5. `createAppTheme` accent/typography contract | ✅ 8/8 in `theme/index.test.js` |
| 6. `accentColor` sourced from real org branding | ✅ covered in `ThemeContext.test.jsx` |
| 7. `fontScale` instant-apply/clamp/persist | ✅ covered in `ThemeContext.test.jsx` |
| 8. Save Appearance merges, doesn't clobber | ✅ rewritten regression case in `settings/index.test.jsx` |
| 9. `fontSize`/`accent` no longer persisted | ✅ new case in `settings/index.test.jsx` |
| 10. Accent Color read-only + manager link | ✅ new case in `settings/index.test.jsx` |
| 11. Live verification | ✅ see below |

Full suite: `theme/index.test.js` 8/8, `theme/contrast.test.js` 5/5,
`ThemeContext.test.jsx` 9/9, `settings/index.test.jsx` 10/10. `npm run
build` + `npm run size` green.

## Live verification

Chrome DevTools MCP, real dev stack, `clinician@medibook.dev`,
`/settings` → Appearance tab:
- Confirmed the main content area already rendered in genuine light
  mode with "Light" selected (the dark sidebar rail is deliberate,
  mode-independent chrome, not part of this bug).
- Moved the Font Size slider to XL via a focused `input[type=range]` +
  `End` keypress (MUI's slider thumb isn't directly clickable via
  coordinate-based click in this harness) — **every piece of text on
  the page visibly grew immediately**: headings, captions, sidebar
  nav items, button labels — confirming real, app-wide, instant
  typography scaling, not just the "Aa" preview glyph.
- Reloaded the page: XL font scale persisted correctly.
- Accent Color section showed the org's real branding color
  (`#006D77`, unset/default for this org) with the correct label
  ("Set by your organization's Branding settings...") and correctly
  showed **no** "Change in Branding" link for the logged-in clinician
  (not manager+ — role gate working as designed).
- Selected Dark theme: the **entire** page (sidebar and content both)
  switched to dark mode instantly.
- Clicked "Save Appearance"; inspected `localStorage
  ['medibook_appearance_prefs']` directly:
  `{"themeMode":"dark","fontScale":1.25,"compact":false,"rtl":false}`
  — both `themeMode` and `fontScale` present, confirming the merge
  fix (the original bug would have produced `{"compact":false,
  "rtl":false}` only, silently dropping both).
- Reloaded the page: **Dark theme and XL font size both survived** —
  the exact regression scenario the original bug enabled, now closed.

## Verdict

Ships as `done`.
