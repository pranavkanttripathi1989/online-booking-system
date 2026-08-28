---
id: BUG047
type: bug
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: done
parent: null
related: [BUG044, PLAN212, TP232, TR232]
---

# BUG047 — Dark mode toggle does nothing; three competing theme definitions coexist, only one wired in

## Source

Found live by the user testing `BUG044`'s Appearance-tab fix: toggling
"Dark" in Settings → Appearance did not change the app's appearance at all,
and the `AppShell` header's own separate "Dark mode" button had the same
problem — visibly toggled its own icon/tooltip, changed nothing else.
Reported as "some component is blue, some is green" — a real, correct
observation once traced to its cause.

## What's wrong, exactly

Three independent theme definitions existed in `frontend/src/`:

1. `theme/index.js` — `medicalTheme`, teal branding, light-only,
   `createTheme()` with no mode awareness. **The only one actually wired
   into `main.jsx`.**
2. `theme/theme.js` — a second, unrelated Google-blue palette (`COLORS`
   export), imported by nothing except (3) below. Otherwise fully dead.
3. `context/ThemeContext.jsx` — a real, correctly-built light/dark
   `ThemeModeProvider` + `useThemeMode()` hook, with genuine palette-aware
   component overrides and `localStorage` persistence — **never imported by
   `main.jsx` or anything else**, so entirely orphaned at the app root.

`layouts/AppShell.jsx`'s header "Dark mode" button was its own fourth,
independent thing: `const [darkMode, setDarkMode] = useState(false)`,
toggled on click, read by nothing — not even a CSS class.

Underneath all of that: `layouts/AppShell.jsx` alone had 91 hardcoded hex
color literals (`bgcolor: '#fff'`, `color: '#202124'`, etc.) that would not
have responded to a real theme switch either way — the app's own top bar,
search box, account dropdown, and bottom nav were never theme-aware to
begin with, part of the broader, already-tracked `UI-2` debt (1,906
warnings project-wide, `FRONTEND_RULES.md` §22).

## Acceptance criteria

- Exactly one theme definition, wired into the app root.
- A real dark palette exists (`palette.mode: 'dark'`), with WCAG-legible
  contrast, not a naive value-invert.
- Every dark-mode toggle in the app (the `AppShell` header button, Settings
  → Appearance's Theme radio) reads and writes one shared source of truth,
  applies immediately, and persists across a reload.
- The app's core chrome (top bar, search, account menu, bottom nav) and at
  least the dashboard's own header/KPI cards render correctly in dark mode
  — no stray white cards, no invisible text.
- `FRONTEND_RULES.md` and the `medibook-design-system` skill record the
  lesson (per explicit user request) so a second competing theme file
  doesn't get created again.
- Honestly scoped: a full sweep of every remaining hardcoded color across
  `pages/`/`components/` is **not** claimed as done — it's the pre-existing
  `UI-2` backlog, now also `UI-8`'s blocker, tracked in `FRONTEND_RULES.md`
  §22, not silently declared complete.

## Resolution

See `PLAN212`/`TP232`/`TR232`.
