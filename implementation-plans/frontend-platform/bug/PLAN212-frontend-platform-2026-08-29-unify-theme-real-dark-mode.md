---
id: PLAN212
type: bug
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: done
parent: null
related: [BUG047, BUG044]
---

# PLAN212 — Unify the theme, ship real app-wide dark mode

## One theme, one provider

`theme/index.js` rewritten from a single static `createTheme()` into
`createAppTheme(mode)`, returning either a light or dark palette (same
teal brand hue, background/paper/text/divider re-balanced for a dark
ground, status colors re-tuned to stay >=4.5:1 on `#0F1B24`/`#16232D` —
not a naive invert). `medicalTheme` kept as a named export
(`createAppTheme('light')`) for anything that still imports it by that
name.

`context/ThemeContext.jsx` rewritten to consume this one factory instead
of duplicating its own palette from the now-dead `theme/theme.js`
(deleted — its only importer was this file, confirmed via a repo-wide
grep before removal). `ThemeModeProvider` now supports `'light'`/`'dark'`/
`'system'` (resolved via `useMediaQuery('(prefers-color-scheme: dark)')`),
persists to `localStorage['medibook_appearance_prefs'].themeMode` — the
same key `BUG044`'s Appearance-tab fix already owns for the rest of that
tab's prefs, so there's one JSON blob, not two competing ones — and syncs
across tabs via a `storage` listener.

`main.jsx` now wraps the app in `<ThemeModeProvider>` instead of a bare
`<ThemeProvider theme={medicalTheme}><CssBaseline/></ThemeProvider>`.

## Wiring both toggles to the one source

- `AppShell.jsx`'s header button: `const { resolvedMode, setMode } =
  useThemeMode()`, `darkMode = resolvedMode === 'dark'`, click calls
  `setMode(darkMode ? 'light' : 'dark')` — no more local `useState`.
- `settings/index.jsx`'s Theme radio group: `const { mode, setMode } =
  useThemeMode()` directly, applies immediately (a caption says so — no
  "Save" step needed for this one control, unlike the rest of the tab).

## Sweeping the highest-visibility breaks

Not a full `UI-2` sweep (out of scope, see `BUG047`'s own acceptance
criteria) — fixed the parts a user hits first:

- `AppShell.jsx`: the collapsed/expanded search box, the top `AppBar`
  itself, the account dropdown `Menu`, and the mobile bottom nav — five
  `bgcolor: '#fff'`-class literals converted to `background.paper`/
  `action.hover`/`action.selected`, borders to `divider`, placeholder text
  to `text.disabled`. Left the sidebar's own permanent dark navy
  (`#1A2332`) alone — an intentional, pre-existing "always-dark sidebar"
  pattern, not a bug.
- `pages/dashboard/index.jsx`: the "Good morning" header card's
  `bgcolor`/`border`/text colors.
- `components/Dashboard/KpiCard.jsx`: same pattern — high-leverage fix
  since this is a shared component reused across dashboards, not a
  single-page one.
- `pages/settings/index.jsx`: the page's own `h4`/`body2` heading colors
  (found unreadable live in dark mode — near-invisible grey text — while
  verifying `BUG044`'s own fix).

## Documentation, per explicit user request ("add this in hard rules and skills")

- `FRONTEND_RULES.md` `UI-1` — warns against ever creating a second theme
  file; `UI-8` — rewritten to state dark mode is now real and shipped,
  names the exact bug class (local `useState` toggle) to never repeat,
  requires `background.paper`/`text.primary`/`text.secondary`/`divider`
  tokens on new code. `§22`'s `UI-2` entry updated to note it is now also
  `UI-8`'s blocker, with the swept-vs-not-swept file list.
- `medibook-design-system` skill: §1 corrected (three files → one, names
  the exact dead/orphaned files so nobody resurrects the wrong one), §5
  rewritten from "planned" to "real and shipped 2026-08-29," stresses that
  background AND text-color literals are the same bug and must be fixed
  together, §8 checklist gained the two new items.

## Testing

`npx eslint` clean (0 new errors) on every touched file. Frontend unit
suite: 30/44 suites pass on a full parallel run; the 14 that fail are
`Exceeded timeout of 5000ms` under host contention, not real failures —
confirmed by re-running three of them (`manager/services`, `admin/Roles`,
`settings/index`) in isolation, all green, none importing anything this
change didn't already touch and re-verify separately. `npm run build`
succeeds. Live-verified against the real dev stack — see `TR232`.

## What this does NOT close

The rest of `pages/`/`components/` (~1,900 of the ~1,906 `UI-2` warnings)
still renders incorrectly in dark mode until each file's own hardcoded
colors are converted — tracked as existing, ratcheted debt in
`FRONTEND_RULES.md` §22, not silently declared fixed. This PLAN ships the
*mechanism* (one real theme, one real shared toggle) and the *highest-
traffic* fixes; it does not ship a full-app sweep.
