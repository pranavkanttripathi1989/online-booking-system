---
id: BUG053
type: bug
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: done
parent: BUG051
related: [PLAN221, TP241, TR241]
---

# BUG053 — Org accent color doesn't cascade everywhere it should

## How it was found

User-reported via two rounds of annotated screenshots: the Calendar page's
"New Booking" button rendered purple/indigo while the sidebar header and
other buttons around it stayed teal; a second round showed the same
purple/indigo accent correctly rendering on the Settings > Appearance
Font Size slider and Save button, alongside a screenshot of a Google-blue
floating "+" action button on the Appointments list and Settings > Clinic's
"Save Clinic Settings" button, both inconsistent with the org's real
branding color (`#080075` for "City Heart Clinic Group").

## Root cause

BUG051 made `theme.palette.primary` derive from the real org's
`myOrgBranding.primary_color` instead of a fixed teal — that mechanism is
sound and already worked correctly for `calendar/index.jsx`'s "New Booking"
button/FAB. The actual defect: dozens of other components across the app
never adopted it, holding their own hardcoded `#006D77`/`#00858F`
("TEAL"/"TEAL_LIGHT") teal literals or a copy-pasted Google-blue gradient
(`#4285F4`/`#1A73E8`), so they stayed fixed regardless of the org's real
branding. This read as visual inconsistency, not a missing feature.

## What was fixed

Full audit (an Explore agent's app-wide sweep plus direct repo-wide greps)
found and fixed every real offender, while leaving deliberate
`FRONTEND_RULES.md` UI-2 exceptions (marketing panels, terminal/code
viewers, fixed sidebar chrome by design, color pickers, per-item identity
palettes, physical-output surfaces) untouched:

- **`layouts/AppShell.jsx`** — the sidebar header (rendering the org's own
  live logo/name against a hardcoded teal gradient — the most visible
  instance of the bug), active-nav highlighting, the top accent divider,
  focus rings, and every teal-tinted shadow/hover wash (24 `TEAL`/
  `TEAL_LIGHT` references plus ~15 separate `rgba(0,109,119,...)`
  literals). Fixed by redeclaring `TEAL`/`TEAL_LIGHT` inside each of the
  three components (`DrawerContent`, `TopNavBar`, `AppShell`) from
  `useTheme().palette.primary`, instead of as fixed module-level constants.
- **`App.jsx`** — the global `FullPageLoader`/`ShellPageLoader` (both
  render inside `main.jsx`'s `ThemeModeProvider`, no chicken-and-egg case).
- **The Google-blue "Save"/"+" anti-pattern**, found repeated across 8
  files: `pages/appointments/index.jsx`'s floating "+" FAB,
  `pages/settings/index.jsx`'s Profile/Notifications/Appearance/Clinic
  "Save" buttons (4 instances), `pages/admin/users/form.jsx`,
  `pages/manager/clinics/{detail,create,edit}.jsx`,
  `pages/manager/rooms/{create,edit}.jsx`.
- **`pages/calendar/index.jsx`** — teal-tinted shadow/hover residue on the
  already-correct "New Booking" button/FAB (8 instances).
- **`pages/appointments/detail.jsx`** — the primary action button and two
  brand-repeated summary-card accent stripes; the `InfoTile` icon
  background; the patient avatar border/shadow. The three semantic
  section-differentiator cards (Notes=purple, Timeline=amber,
  Clinician=green) were explicitly identified and left untouched — a
  deliberate per-card-type identity convention, not brand repetition.
- **Three dashboard greeting banners**: `pages/dashboard/index.jsx`,
  `pages/clinician/Dashboard.jsx`, `pages/patient/Dashboard.jsx`, plus a
  KPI-card focus-ring residue on the first.
- **`pages/clinician/Calendar.jsx`**, **`components/shared/StitchKpiCard.jsx`**,
  **`components/shared/DoctorCard.jsx`** — teal-tinted hover shadows found
  during the repo-wide sweep, not in the original audit.
- **`components/Calendar/CalendarView.css`** — FullCalendar's plain-CSS
  overrides (10 `rgba(0, 109, 119, ...)` literals) can't reach a
  `theme.components` override at all (separate DOM tree). Fixed by a new
  `--mb-primary-rgb` CSS custom property, set from `context/
  ThemeContext.jsx`'s existing `data-theme`-setting effect (same "DOM hook
  for a 3rd-party stylesheet" pattern BUG047 already established for
  light/dark mode), consumed as `rgba(var(--mb-primary-rgb), alpha)`.

**New additive capability**: `secondary_color` — already exposed
end-to-end by the backend (`schema.prisma`, `schema.gql`,
`org-settings.service.ts#toBranding()`) but never consumed by the frontend
theme — is now wired into `theme.palette.secondary` via a
`buildSecondaryFromAccent()` mirroring the existing `buildPrimaryFromAccent()`,
and `ThemeContext.jsx`'s org-branding query extended to fetch it. No
backend change was needed.

## Verification

Unit tests: new `layouts/AppShell.test.jsx` (header background tracks a
custom accent), a new BUG053 describe block in
`pages/appointments/index.test.jsx` (FAB), and a new BUG053 describe block
in `pages/clinician/Dashboard.test.jsx` (banner) — each asserting the
rendered CSS actually changes under a different `accentColor` and contains
the real accent hex, not a fixed literal. `context/ThemeContext.test.jsx`
extended for `secondary_color`/`secondaryColor`. Full lint clean (0 errors,
0 `no-hardcoded-colors` warnings) across every touched file; production
build + `npm run size` green (no bundle-budget regression).

Live-verified against the real dev stack, logged in as `manager@medibook.dev`
and `clinician@medibook.dev` (both "City Heart Clinic Group", real
`primary_color: #080075`): sidebar header/nav, the Appointments FAB, the
Calendar "New Booking" button/pills, the Appointment Detail page's action
button and two summary cards (with the three deliberate exceptions
confirmed unchanged), Settings > Clinic's "Save Clinic Settings" button,
Settings > Appearance's Theme radio and read-only Accent Color display, and
the clinician dashboard's greeting banner all render the real `#080075`
accent, not teal or Google-blue.
