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

## Part 2, same day — backend sync + Phase 1 colour sweep

Two direct follow-up requests from the user after the first pass shipped:
sync the preference to the backend (cross-device), and add a comprehensive
hard rule plus an actual sweep of shared components/layouts, framed as "a
proper plan" — executed via `EnterPlanMode`/`ExitPlanMode` given the scope.

- Backend: `UserProfiles.theme_mode`, wired through the existing
  `myProfile`/`updateMyProfile` pair (no new resolver). `ThemeModeContext`
  now writes-through best-effort when authenticated and hydrates a fresh
  device from the synced value. Live-verified end-to-end (real DB write,
  real cross-device hydration), not just unit-tested.
- A new shared `theme.palette.appointmentStatus` extension (light+dark
  `{bg,text,border,dot}` per status) replaced five separate per-file
  status-colour hex maps — the actual fix for the recurring "status chip"
  pattern, not five individual patches.
- Phase 1 of the phased sweep (`components/` + `layouts/`, the two
  directories every role renders through) completed: project-wide
  hardcoded-colour warnings 1,741 → 1,447. Phases 2-4 (patient/public,
  clinician, staff/admin/manager) recorded as an explicit, sequenced
  backlog in `FRONTEND_RULES.md` §22, not started.
- A genuine host-level event (machine reboot mid-session, load average
  183+) caused transient full-suite test flakiness, resolved by waiting
  for load to settle rather than by retrying — see `TR232`'s own account.

See `PLAN212`/`TP232`/`TR232`'s own "Part 2" sections for the full detail.

## Part 3, same session (bare "continue") — Phase 2 of the colour sweep

Picked up the plan's own explicit backlog: swept `auth/`, `public/`,
`patient/`, `onboarding/`, `booking/` (9 files) — project-wide colour
warnings 1,447 → 1,330. Same conversion pattern as Phase 1, plus two new
recurring shapes: per-status/per-role hex maps duplicated in page files
(not just shared components), and deliberate literal exceptions for
guest-facing marketing/brand panels (login's `BrandPanel`, the public
landing hero, the forgot/reset-password left panel) — a fixed gradient
independent of the app's own theme toggle, matching `PublicLayout`'s
footer precedent from Phase 1.

One real bug found mid-sweep: deleting `doctor-profile.jsx`'s `BRAND`
constant broke ~12 usages a hex-literal-only grep never caught (they
referenced the variable, not a literal) — caught immediately by lint,
fixed in the same pass. Recorded as a specific gotcha in `FRONTEND_RULES.md`
§22 for whoever picks up Phase 3/4: grep a colour constant's own name, not
just literal hex, before deleting it.

Live-verified in dark mode: the login page's two-column layout, and the
public landing page (header, hero search card, filters sidebar, doctor-
result cards). Phase 3 (clinician tablet-first tier) is next, not started.
