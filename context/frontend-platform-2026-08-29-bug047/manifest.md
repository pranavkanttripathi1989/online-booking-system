---
id: CTX-frontend-platform-2026-08-29-bug047
type: bug
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: done
parent: null
related: [BUG047, PLAN212, TP232, TR232, BUG044]
---

# Unify the theme, ship real app-wide dark mode (2026-08-29)

Found live by the user while verifying `BUG044`'s Appearance-tab fix:
toggling "Dark" changed nothing, and `AppShell`'s own separate header
toggle was equally fake. Root cause was architectural, not a small bug —
three competing theme definitions existed (`theme/index.js`, live but
light-only; `theme/theme.js`, dead; `context/ThemeContext.jsx`, a real
light/dark provider that was simply never connected to `main.jsx`), plus
two independent, disconnected "dark mode" toggles neither of which read
from any of them.

Fixed by collapsing to one theme factory (`createAppTheme(mode)`) and one
shared `useThemeMode()` context, wiring both toggles to it, and sweeping
the highest-visibility hardcoded-color breaks (`AppShell` chrome, the
dashboard header card, the shared `KpiCard` component, Settings' own page
heading). Explicitly does **not** claim the full ~1,900-warning `UI-2`
backlog is fixed — that remains open, ratcheted debt, now also blocking
full `UI-8` compliance, tracked in `FRONTEND_RULES.md` §22.

Per explicit user request ("add this in hard rules and skills"),
`FRONTEND_RULES.md` (`UI-1`, `UI-8`, §22) and the `medibook-design-system`
skill were both updated with the concrete lesson — never create a second
theme file, every toggle reads the one shared context, background AND
text-color literals are the same bug and must be fixed together.

## Documents

- `requirements/frontend-platform/bug/BUG047-*.md` (done)
- `implementation-plans/frontend-platform/bug/PLAN212-*.md`
- `test-plans/frontend-platform/bug/TP232-*.md`
- `test-results/frontend-platform/bug/TR232-*.md`

## Also touched, not part of the doc set

- `FRONTEND_RULES.md` — new `FORM-20` (rich text editor for reader-facing
  free text, per a separate direct user request mid-session), `UI-1`/
  `UI-8`/§22 updates for this bug.
- `.claude/skills/medibook-design-system/SKILL.md` — corrected to the new
  single-theme reality.
