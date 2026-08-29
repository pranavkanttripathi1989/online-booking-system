---
id: PLAN221
type: bug
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: done
parent: BUG053
related: [TP241, TR241]
---

# PLAN221 — Org accent color doesn't cascade everywhere it should

## Context

BUG051 made `theme.palette.primary` derive from the real org's
`myOrgBranding.primary_color`. `calendar/index.jsx`'s "New Booking" button/
FAB already correctly read it. The rest of the app didn't follow —
dozens of components held their own fixed teal (`#006D77`/`#00858F`) or a
copy-pasted Google-blue gradient (`#4285F4`/`#1A73E8`), regardless of the
org's real branding. Confirmed with a repo-wide grep + an Explore agent's
full-tree audit before any fix was written.

## Phase 1 — Global app chrome (highest blast radius)

- **`layouts/AppShell.jsx`** — module-level `TEAL`/`TEAL_LIGHT` constants
  (24 references) redeclared inside each of `DrawerContent`, `TopNavBar`,
  `AppShell` from `useTheme().palette.primary`. ~15 separate
  `rgba(0,109,119,...)` shadow/hover literals converted to
  `alpha(theme.palette.primary.main, X)`.
- **`App.jsx`** — `FullPageLoader`/`ShellPageLoader` (both render inside
  `ThemeModeProvider`, confirmed via `main.jsx`) converted from fixed
  `#F0F7F8`/`#006D77` to `alpha(primary.main, 0.04)`/`primary.main`.
- **`pages/appointments/index.jsx`** — the floating "+" FAB's Google-blue
  gradient (`#4285F4`/`#1A73E8`) replaced with the same
  `(t) => linear-gradient(..., t.palette.primary.light, t.palette.primary.main)`
  pattern already correct on `calendar/index.jsx`'s own FAB.
- **The same Google-blue "Save" pattern**, found repeated in
  `pages/settings/index.jsx` (4 buttons: Profile/Notifications/Appearance/
  Clinic), `pages/admin/users/form.jsx`,
  `pages/manager/clinics/{detail,create,edit}.jsx`,
  `pages/manager/rooms/{create,edit}.jsx` — all converted the same way.

## Phase 2 — Booking/appointment surfaces

- **`pages/calendar/index.jsx`** — 8 teal-tinted shadow/hover residue
  spots (the button/FAB fill was already correct; only their shadows
  weren't) converted to `alpha(theme.palette.primary.main, X)`.
- **`pages/appointments/detail.jsx`** — the primary action button (429-430)
  and two brand-repeated summary cards (747, 1195) converted to
  `theme.palette.primary`; the `InfoTile` icon background (242) and the
  patient avatar border/shadow (760-761), found during the repo-wide
  sweep, also converted. **Explicitly excluded, confirmed by reading full
  context**: the Notes (purple), Timeline (amber), Clinician (green) cards
  — a deliberate per-card-type identity convention on one detail page, the
  Notes card's own icon/border already semantically uses
  `theme.palette.secondary`.

## Phase 3 — Role dashboard greeting banners

`pages/dashboard/index.jsx` (banner + a KPI-card focus-ring residue),
`pages/clinician/Dashboard.jsx`, `pages/patient/Dashboard.jsx` — all
converted from a fixed teal gradient to `theme.palette.primary`.

## Phase 3.5 — Additional offenders found during the repo-wide sweep

Not in the original audit list, found by a direct grep for
`rgba(0,109,119` and `#4285F4` across `pages`/`components`/`layouts`:
`pages/clinician/Calendar.jsx` (a selected-slot shadow),
`components/shared/StitchKpiCard.jsx`, `components/shared/DoctorCard.jsx`
(hover shadows) — all converted the same way.
`components/Dashboard/{ServicePieChart,RecentAppointmentsTable}.jsx`'s own
Google-blue-adjacent literals were checked and correctly left alone — both
are documented, deliberate fixed per-item identity palettes (chart slices /
avatar initials), not a brand-tracking bug.

## Phase 4 — `secondary_color` wiring (new, additive)

No backend change — `secondary_color` was already exposed end-to-end
(`schema.prisma`, `schema.gql`, `org-settings.service.ts#toBranding()`),
confirmed by reading each layer before writing any frontend code.
`context/ThemeContext.jsx`'s `GET_MY_ORG_ACCENT_COLOR` query extended to
also fetch `secondary_color`; `theme/index.js` gained
`buildSecondaryFromAccent()`, an exact structural mirror of the existing
`buildPrimaryFromAccent()`, applied to `palette.secondary` when present.

## Phase 4.5 — FullCalendar CSS (found during Phase 4, extended scope)

`components/Calendar/CalendarView.css` has 10 `rgba(0, 109, 119, ...)`
literals that a `theme.components` override structurally cannot reach
(FullCalendar renders outside MUI's component tree — the same limitation
BUG047 already solved for light/dark mode via a `data-theme` attribute).
Fixed the same way: `ThemeContext.jsx`'s existing DOM-attribute effect
extended to also set a `--mb-primary-rgb` CSS custom property (an "r, g, b"
triplet, since `rgba(var(--x), alpha)` needs numeric components, not a
hex), consumed by the CSS file as `rgba(var(--mb-primary-rgb), alpha)`.
`index.css` gained a static `:root` fallback (`0, 109, 119`) so the
variable never resolves to `NaN` before the first React paint.

## Testing

New `layouts/AppShell.test.jsx` (header background under two different
`accentColor`s, read via the live CSSOM `cssRules` — jsdom doesn't resolve
`getComputedStyle` for emotion's gradient shorthand, confirmed by testing
three approaches before finding one that works). New BUG053 describe
blocks in `pages/appointments/index.test.jsx` (FAB) and
`pages/clinician/Dashboard.test.jsx` (banner), same CSSOM-read pattern.
`context/ThemeContext.test.jsx` extended for `secondary_color`/
`secondaryColor` (the query's re-declared AST in the test file needed the
matching field added, per its own "must match exactly" convention — this
is what actually broke on the first run, not a real regression).

Full lint pass across every touched file: 0 errors, 0
`no-hardcoded-colors` warnings. Production build + `npm run size`: all
three budgets green (initial bundle 329.8 kB / 350 kB, largest lazy chunk
109.92 kB / 115 kB, initial CSS 13.59 kB / 18 kB).

## Live verification

Chrome DevTools MCP against the real dev stack, logged in as
`manager@medibook.dev` and `clinician@medibook.dev` (both real accounts on
"City Heart Clinic Group", real `primary_color: #080075`,
`secondary_color: #000480`): confirmed the sidebar header/nav, Appointments
FAB, Calendar "New Booking" button and "Today"/"This Week" pills,
Appointment Detail's action button and two summary cards (with the three
excluded cards confirmed still purple/amber/green, unchanged), Settings >
Clinic's "Save Clinic Settings" button, Settings > Appearance's Theme radio
and read-only Accent Color field, and the clinician dashboard's greeting
banner all render the real `#080075` accent — not teal, not Google-blue.
