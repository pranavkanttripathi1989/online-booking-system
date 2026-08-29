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

### Part 3 (same day) — Phase 2 of the colour sweep (patient/guest, mobile-first)

Continuation of the phased plan above, picked up on a bare "continue" —
swept `auth/`, `public/`, `patient/`, `onboarding/`, and `booking/` (9
files): `login.jsx` (57→3), `landing.jsx` (15→3), `patient/Appointments.jsx`
(10→0), `public/doctor-profile.jsx` (9→0), `auth/forgot-password.jsx` (8→2),
`onboarding/index.jsx` (8→0), `auth/reset-password.jsx` (7→2),
`patient/Dashboard.jsx` (7→0), `patient/Profile.jsx` (5→0),
`booking/index.jsx` (1→0). Project-wide count: 1,447 → 1,330.

Same conversion pattern as Phase 1, plus two new recurring shapes:

- **Per-status/per-role hex maps duplicated in page files**, not just
  shared components: `login.jsx`'s password-strength colour map,
  `patient/Appointments.jsx`'s appointment-border-colour map,
  `patient/Dashboard.jsx`'s KPI-card and status-dot colours — all
  converted to theme-derived tones (`theme.palette.success/error/
  warning/info.main`, or the shared `appointmentStatus` extension from
  Phase 1) rather than re-inventing hex per file.
- **Deliberate literal exceptions, a new category**: fixed marketing/brand
  panels on guest-facing pages (`login.jsx`'s `BrandPanel`, `public/
  landing.jsx`'s hero section, `forgot-password.jsx`/`reset-password.jsx`'s
  matching left panel) — a teal gradient with white text, independent of
  the app's own light/dark toggle, the same convention as `PublicLayout`'s
  footer from Phase 1. Each documented inline.

**One real bug found while sweeping, not colour-related**: deleting
`doctor-profile.jsx`'s `const BRAND = '#006D77'` broke roughly a dozen
usages an initial `grep` for literal hex strings never surfaced, because
they referenced the variable (`BRAND`, `` `${BRAND}08` ``), not a literal
— caught immediately by re-running lint (undefined-variable errors), not
silently shipped. Grepping for the constant's own name, not just for hex
literals, before deleting any such module-level colour constant is now
recorded in `FRONTEND_RULES.md` §22 as a specific gotcha for whoever
picks up Phase 3/4.

**Testing**: `npx eslint` clean (0 new errors) across all 9 files. Existing
dedicated tests re-run and passing: `patient/Appointments.test.jsx` (5/5),
`patient/Family.test.jsx`, `auth/reset-password.test.jsx` (6/6),
`booking/index.test.jsx`. A `patients/detail.test.jsx` failure surfaced in
a combined run is the same pre-existing, unrelated flaky suite this
codebase's own history already documents — confirmed by `git status`
showing zero changes to that file. `npm run build` succeeds. Live-verified
via Chrome DevTools MCP: the login page's two-column layout in dark mode
(brand panel unchanged, form panel/tabs/inputs correctly dark), and the
public landing page in dark mode (header bar, hero search card, filters
sidebar, and doctor-result cards all render correctly with no stray white
surfaces).

### Part 4 (same day) — Phase 3 of the colour sweep (clinician, tablet-first)

Continuation on a bare "continue" — swept `calendar/index.jsx` (150→0),
`appointments/detail.jsx` (112→0), `clinician/Calendar.jsx` (81→0),
`appointments/index.jsx` (69→0), `clinician/Dashboard.jsx` (28→0),
`clinician/Patients.jsx` (14→0), `appointments/edit.jsx` (9→0),
`clinician/Availability.jsx` (6→0), `clinician/EncounterWorkspace.jsx`
(3→0) — all 9 Phase 3 files now fully clean. Project-wide count:
1,330 → 858.

Same conversion pattern as Phases 1-2, plus:

- **`theme.palette.appointmentStatus` gained a `scheduled` tone**
  (`theme/index.js`) — every prior file converted to it used a subset of
  statuses that happened to exclude `'scheduled'`, a real, common
  appointment status this codebase's own history had already flagged as
  a previously-missing dropdown option (`edit.jsx`'s own `STATUS_OPTIONS`
  fix). `'break'` (a lunch/schedule-block event, not a real appointment
  status) stays a small local `alpha(warning.main, ...)` helper per file,
  not added to the shared palette.
- **Mock-vs-real colour unification**: `clinician/Calendar.jsx`'s
  `MOCK_EVENTS` stored a per-type hex (`color: '#006D77'` for in-person,
  etc.) while its real-appointment mapping stored a per-status hex — two
  different, inconsistent sources for the same field. Replaced both with
  one `eventDisplayColor(theme, ev)` helper (type-based for mock/break/
  block events, status-based for everything else), removing the `color`
  field from both code paths entirely rather than patching two hex maps
  in parallel.

**Two real, non-colour bugs found live while verifying this phase in the
browser** (via Chrome DevTools MCP, not just lint/build), both now fixed
in `clinician/Calendar.jsx`:

1. **Lunch break showed on every day of the week, including weekends.**
   The seed script (`backend/prisma/seed.ts`, this same session's own
   separate "complete seed data" work) wrote `ClinicianAvailability`/
   `LunchBreaks.day_of_week` using ISO numbering (Monday=1), but this
   app's real runtime convention — confirmed against `clinician/
   Availability.jsx`'s own write path (`day_of_week: String(dayIndex)`
   from a `DAYS = ['Mon', ...]` array) — is Monday=0. The schema
   comment on `ClinicianAvailability.day_of_week` ("0-6 Sunday-Saturday")
   is itself stale/wrong documentation, not the real convention. Fixed
   the seed (Mon-Fri now `day_of_week: 0..4`, lunch break now 5 explicit
   weekday rows instead of a `null` "every day" sentinel) and corrected
   the already-seeded dev-DB rows directly.
2. **The hover popover's "Click to view full details →" link was
   permanently unreachable.** `ApptPopover`'s root `<Popover>` had
   `pointerEvents: 'none'` on its own `sx`, which — combined with a
   200ms close-on-mouseleave timer on the trigger card — meant moving
   the real mouse from the card toward the popover always registered as
   leaving the card (hiding the popover) before the cursor could reach
   the link, and even if it hadn't, the link itself couldn't receive a
   click at all. Fixed by keeping `pointerEvents: 'none'` on the
   Popover root (so it still doesn't block the page underneath) but
   setting `pointerEvents: 'auto'` on `slotProps.paper` and giving the
   paper its own `onMouseEnter`/`onMouseLeave` that share the trigger
   card's own hide-timer — the standard MUI recipe for a hoverable
   non-modal popover. Pre-existing, not introduced by this colour sweep.

**A separate, larger finding, not scoped to `clinician/`**: sweeping
`appointments/index.jsx`'s `<DataGrid>` surfaced that `src/index.css`
carried a global, `!important`-laden `.MuiDataGrid-*` block hardcoded to
the light palette — it silently beat every theme-aware `sx` override on
that page, rendering dark-on-dark unreadable cell text in dark mode. This
is exactly the `UI-5` violation ("never a global CSS file, never
`!important`") already named in this rules file, just never enforced
against `.css` files (the `no-hardcoded-colors` ESLint rule only scans
`.jsx`). Fixed by moving it to a `theme.components.MuiDataGrid` override
(`theme/index.js`) reusing the same `tableHeadBg`/`tableHeadColor`/
`rowHoverBg` tokens `MuiTableHead`/`MuiTableRow` already share, and
deleting the global block. The same file's `.recharts-*` (chart tooltips)
and `.fc-*` (FullCalendar, actively used by `calendar/index.jsx`) blocks
had the identical light-only hardcode problem but render *outside* MUI's
component tree, so a `theme.components` override can't reach them —
given `[data-theme='dark']` CSS variants instead, backed by a new
`data-theme` attribute `context/ThemeContext.jsx` now sets on `<html>`
specifically for this "third-party DOM, plain-CSS-only" case. The rest of
`src/index.css` (hardcoded `body`/`#root` colours, scrollbar colours, and
a block of confirmed-dead `.status-*`/`.tag-*`/`.skeleton-shimmer`/
`.hover-card` classes with zero real importers) is **not yet audited** —
recorded as a new, explicit backlog entry in `FRONTEND_RULES.md` §22.

**A related test-infrastructure gap, also fixed**: `appointments/
index.test.jsx` rendered with no `<ThemeProvider>` at all, which passed
silently until `StatusChip`/`NoShowRiskChip` started reading
`theme.palette.appointmentStatus` — `useTheme()` with no provider
silently returns MUI's bare default theme (no custom palette keys),
crashing the whole render to a blank `<div/>` with a
`Cannot read properties of undefined` error, not a clear test failure
message. Fixed by wrapping the test in the real
`<ThemeProvider theme={createAppTheme('light')}>`, matching how the real
app is never rendered without one (`main.jsx`). Recorded in
`FRONTEND_RULES.md` UI-8 as a rule for any future test exercising a
component that reads a custom palette extension.

**Testing**: `npx eslint` clean (0 new errors, 0 remaining theme-token
warnings) across all 9 Phase 3 files plus `theme/index.js`,
`context/ThemeContext.jsx`, `src/index.css`, and `backend/prisma/seed.ts`.
`npx tsc --noEmit` clean on `seed.ts`. Existing dedicated tests re-run:
`appointments/index.test.jsx` (3/3, after the ThemeProvider fix — this
same suite's own no-show-risk-chip test caught the missing-palette bug
in the first place), `appointments/edit.test.jsx` (7/7),
`clinician/Dashboard.test.jsx` (5/5), `clinician/
EncounterWorkspace.test.jsx` (22/23 — the one failure is a pre-existing,
unrelated 5000ms timeout on a referral-scheduling test, confirmed via
`git status` showing zero changes to that file, consistent with this
suite's own already-documented host-load flakiness). `npm run build`
succeeds. Live-verified via Chrome DevTools MCP against the real dev
backend, logged in as `manager@medibook.dev`/`clinician@medibook.dev`:
the real-data appointments list and its `StatusChip`/`NoShowRiskChip`
rendering, the clinician calendar's real seeded appointments, the
"Appointment Details" drawer opened by a real click, and the
`/calendar` (manager) route's 403 fallback page — all correctly dark.
The FullCalendar/Recharts CSS fix was verified by confirming the served
`[data-theme='dark']` rules are present in the live dev-server response
and that `document.documentElement.dataset.theme` is set correctly; a
concurrent session sharing the same browser prevented a final
side-by-side screenshot of `calendar/index.jsx` itself in dark mode, so
that one specific page is verified by code/specificity review rather
than a live screenshot — noted honestly rather than claimed as seen.

### Phase 4 (backlog, sequenced, not started)

Recorded in `FRONTEND_RULES.md` §22's `UI-2` entry with the exact
per-directory counts. Staff/manager/admin desktop-dense tier (`staff/`,
`finances/`, `manager/`, `admin/`, `patients/`, `analytics/`,
`clinicians/`, `messages/`, `reviews/`, `settings/` remainder, ~660
warnings) — largest volume, lowest per-screen risk. A future session
should re-measure the warning count before trusting any number written
here, then pick up Phase 4. Also still open: the rest of `src/index.css`
(see Part 4's own finding above) and the "complete seed data" backend
work this same session did in parallel (`backend/prisma/seed.ts` — a home
clinic, clinician/patient rows, availability, sample appointments for the
demo accounts) is functionally separate from this bug/plan and not
formally documented under its own `REQ`/`PLAN` — worth a proper writeup
if extended further.
