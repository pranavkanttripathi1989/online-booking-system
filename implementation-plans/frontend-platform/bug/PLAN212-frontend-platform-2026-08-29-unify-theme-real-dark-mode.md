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

## What this does NOT close (as of the first pass, above)

The rest of `pages/`/`components/` (~1,900 of the ~1,906 `UI-2` warnings)
still renders incorrectly in dark mode until each file's own hardcoded
colors are converted — tracked as existing, ratcheted debt in
`FRONTEND_RULES.md` §22, not silently declared fixed. The first pass shipped
the *mechanism* (one real theme, one real shared toggle) and the *highest-
traffic* fixes; it did not ship a full-app sweep or backend sync. Both were
picked up the same day, per direct user request — see Part 2 below.

---

## Part 2 (same day) — backend-integrate the preference + Phase 1 colour sweep

Two things the user asked for directly after the first pass shipped:
(1) the preference should follow a user across devices, not live only in
`localStorage`; (2) "every component should look proper... on the basis of
theme setting," with an explicit new hard rule to that effect.

### Backend integration

`UserProfiles.theme_mode String?` (hand-written migration
`20260829020000_add_theme_mode_to_user_profiles`) — the same 1:1-with-`Users`
model that already holds `bio`/`gender`/`date_of_birth`/`address_structured`,
per Hard Rule 7 (matched the real `myProfile`/`updateMyProfile` contract
instead of inventing a new query). `MyProfileType`/`UpdateMyProfileInput`
both gained `theme_mode` (`@IsIn(['light','dark','system'])` on the input —
this file's own established "every `@Field` needs a validator" rule).
`account.service.ts`'s `toProfile()`/`updateMyProfile()` pass it straight
through, matching the existing `bio`/`first_name` pattern — no special
null-handling needed. 2 new `account.service.spec.ts` cases (round-trip,
`undefined` not `null` when never set). `tsc --noEmit` + `eslint` clean;
32/32 existing + new tests pass.

`context/ThemeContext.jsx`: on `setMode(next)`, still writes `localStorage`
instantly (unchanged UX — never blocks on the network), and additionally
fires `updateMyProfile({theme_mode: next})` best-effort if a session exists
(`localStorage['medibook_has_session']`, read directly rather than coupling
to `AuthContext` — `ThemeModeProvider` sits above `AuthProvider` in
`main.jsx`'s tree). On first mount, if this device has **no** stored
preference yet, a one-time `myProfile { theme_mode }` query hydrates from
the synced value — a device with its own existing local choice is never
overridden. Both branches guarded so a logged-out/guest session never
attempts a backend call. New `context/ThemeContext.test.jsx` (4 cases: fires
the mutation when authenticated, does not when logged out, hydrates on a
device with no local pref, does not override a device that has one) — all
new coverage for a file that had none before.

**Live-verified end-to-end**, not just unit-tested: logged in as
`admin@medibook.dev`, toggled dark, confirmed via a direct authenticated
`fetch()` from the browser console that `myProfile.theme_mode` was really
`"dark"` in the database — then cleared this device's `localStorage` and
reloaded, confirming the page came up dark from the backend value alone
(the literal "new device" scenario), and that reload re-populated
`localStorage` from that hydration. Reverted the admin account back to
`light` afterward via the same real UI path.

### Part B — comprehensive hard rule (as asked)

`FRONTEND_RULES.md` `UI-8` extended with the full component checklist the
user asked for — background, border, text (both primary and secondary),
shadow, gradient, inputs, sidebar/nav selected-state, icon-pill tint — each
with a one-line "wrong vs right" example, stated as: *"fixing only
background+text and leaving a light-mode-tuned shadow or gradient is still
an incomplete fix."* `§22`'s `UI-2` entry rewritten with the exact phased
plan below (Phase 1 done, Phases 2-4 backlog) so a future session can
resume mechanically. `medibook-design-system` skill §5 got the same
checklist plus the backend-sync fact.

### Part C — Phase 1 colour sweep (shared components + layouts)

Measured before: **1,741** warnings (`npx eslint src/pages src/components
src/layouts`, re-measured after the first pass above). Swept the whole of
`frontend/src/components/**` (22 files) and the whole of `frontend/src/
layouts/**` (`AppShell.jsx` remainder, `AdminLayout.jsx`, `AuthLayout.jsx`,
`PublicLayout.jsx`) — the two directories every role's pages render
through, so this phase improves all five roles at once rather than one
surface.

**Pattern used, file by file**: literal `#fff`/`#FFFFFF` backgrounds →
`background.paper`; `#202124`-class text → `text.primary`; `#5F6368`/
`#9AA0A6`-class → `text.secondary`/`text.disabled`; `#E8EAED`/`#D0E8EA`-class
borders → `divider`; hover tints → `action.hover`/`action.selected` or
`alpha(theme.palette.X.main, n)`. Where a file had its own hand-picked
per-status or per-role hex map (`RecentAppointmentsTable`'s `STATUS_CONFIG`,
`StitchStatusChip`/`StatusChip`/`RoleBadge`'s role/status maps,
`CalendarView`'s `STATUS_BG`, `AppShell`'s `TYPE_COLOR`/`TYPE_BG` search-
result tinting and `ROLE_COLORS` sidebar badge), that map was replaced with
a **shared, mode-aware source**: a new `theme.palette.appointmentStatus`
extension on `theme/index.js` (confirmed/pending/cancelled/completed/
rescheduled/no_show, each with a light and dark `{bg, text, border, dot}`
derived from the theme's own success/warning/error/info/secondary groups
via `alpha()` — not a naive invert), plus small per-file `roleAccent()`/
`typeStyle()`/`toneColors()` helper functions following the identical
pattern for role- and category-tinted chips. This is the same fix applied
once instead of the same hex map re-invented in five different files.

**Deliberately left as literal, each with an inline comment** (per the
design-system skill's own "genuinely one-off" exception, applied
consistently): fixed multi-hue decorative palettes that must stay stable
and vivid regardless of theme mode (avatar-identity-hash colours in
`RecentAppointmentsTable`/`ClinicianCard`/`ClinicianProfileDrawer`, the
8-colour pie-chart ramp in `ServicePieChart`, the confetti burst); text
rendered on top of an arbitrary saturated per-event colour in
`CalendarView` (always white, independent of app theme by necessity); and
chrome that is **permanently dark by design, independent of the app's own
light/dark mode** — `AppShell`'s sidebar and its `TopNavBar` counterpart
(`#1A2332`, a common "always-dark nav" pattern), the impersonation warning
banner (deliberately theme-invariant red/white per `SURF-17`'s "unmissable"
requirement), and `PublicLayout`'s marketing footer band (a fixed dark
footer independent of the app-content theme toggle, a common marketing-site
convention).

**Result**: project-wide count dropped from 1,741 to **1,447** warnings — a
measured reduction of 294, matching the targeted `components/`+`layouts/`
total (~384) minus the legitimate, now-documented exceptions (~90).

**Testing**: `npx eslint` clean (0 new errors) on every touched file across
both directories. Full `npx jest src/components` (8 suites/35 tests) and
`npx jest src/layouts` (1 suite/4 tests) pass, plus every file with an
existing dedicated test (`StitchKpiCard`, `RoleGuard`, `NotificationBell`,
`PublicLayout`) re-run individually to confirm no regression. A full-repo
`npx jest` run showed 8/45 suites failing on `Exceeded timeout of 5000ms`
during a genuine host-level event — `uptime` showed the machine had just
rebooted (load averages in the 100-200 range, matching this repo's own
documented post-reboot storm pattern) — re-running the same 8 suites
individually once the load average settled below 10 showed all passing
cleanly; none of the 8 import a file this phase touched. `npm run build`
succeeds. Live-verified via Chrome DevTools MCP: admin dashboard (desktop,
both modes), the appointments list (confirming `StatusChip`'s real MUI
`color` prop chips render correctly), and the patient dashboard at 360px
(the mobile-first tier) in dark mode — see the live-verification note
above for the backend round-trip check.

### Phase 2-4 (backlog, sequenced, not started)

Recorded in `FRONTEND_RULES.md` §22's `UI-2` entry with the exact
per-directory counts: **Phase 2** — guest/patient mobile-first tier
(`auth/`, `public/`, `patient/`, `onboarding/`, `booking/`, ~150 warnings) —
highest product priority per `FRONTEND_RULES.md` §5's own tiering table.
**Phase 3** — clinician tablet-first tier (`clinician/`, `calendar/`,
`appointments/`, ~420). **Phase 4** — staff/manager/admin desktop-dense
(`staff/`, `finances/`, `manager/`, `admin/`, `patients/`, `analytics/`,
`clinicians/`, `messages/`, `reviews/`, `settings/` remainder, ~660) —
largest volume, lowest per-screen risk. A future session should re-measure
the warning count before trusting any number written here, then pick up
the next incomplete phase in order.
