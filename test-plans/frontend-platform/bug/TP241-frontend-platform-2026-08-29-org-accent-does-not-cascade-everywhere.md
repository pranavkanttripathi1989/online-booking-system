---
id: TP241
type: bug
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: approved
parent: PLAN221
related: [TR241]
---

# TP241 — Org accent color doesn't cascade everywhere it should

## Unit tests

1. `layouts/AppShell.test.jsx` (new) — renders `AppShell` under
   `createAppTheme('light', {accentColor: null})` and again under
   `{accentColor: '#080075'}`; asserts the sidebar brand header's
   generated CSS differs between the two and contains `#080075` under the
   custom-accent render.
2. `pages/appointments/index.test.jsx` — new describe block: renders the
   page under a `#080075`-accented theme; asserts the new-appointment
   FAB's generated CSS contains `#080075` and does **not** contain
   `#4285f4`/`#1a73e8` (the old Google-blue literal).
3. `pages/clinician/Dashboard.test.jsx` — new describe block: renders the
   dashboard under a `#080075`-accented theme with a genuine empty day;
   asserts the greeting banner's generated CSS contains `#080075` and does
   **not** contain `#006d77` (the old fixed teal).
4. `context/ThemeContext.test.jsx` — extended the existing accentColor
   describe block to also assert `secondaryColor` resolves from
   `myOrgBranding.secondary_color`, and falls back to `null` for an
   org-less caller (mirroring the existing `accentColor` test exactly).

## Regression (existing suites re-run, unchanged expected behavior)

- `pages/appointments/index.test.jsx`'s existing no-show-risk-indicator
  tests (P1-17) — confirm the FAB fix didn't disturb unrelated page
  behavior.
- `pages/clinician/Dashboard.test.jsx`'s existing BUG021 tests (real data,
  not fabricated; not-linked state; error state; empty day; confirmed
  counts as upcoming) — confirm the banner fix didn't disturb data
  rendering.
- `pages/settings/index.test.jsx`'s full Appearance suite (BUG051) —
  confirm the Save-button color change didn't disturb the merge-safe
  localStorage behavior BUG051 fixed.
- `components/shared/StitchKpiCard.test.jsx` — confirm the hover-shadow
  change didn't disturb the card's own data rendering.

## Static checks

- `npx eslint` across every touched file: 0 errors, 0
  `no-hardcoded-colors` warnings (the rule that would have caught a
  reintroduced literal).
- `npm run build` — production build succeeds with no compile errors.
- `npm run size` — all three tracked budgets (initial bundle, largest lazy
  chunk, initial CSS) stay within their `.size-limit.json` limits.

## Live verification (Chrome DevTools MCP, real dev stack)

Real accounts on "City Heart Clinic Group" (`primary_color: #080075`,
`secondary_color: #000480`):

1. `manager@medibook.dev` — `/manager/dashboard` (sidebar header/nav,
   "+"/theme-toggle icons), `/appointments` (New Booking button, floating
   FAB), `/appointments/:id` (action button, two fixed summary cards
   accent-toned; Notes/Timeline/Clinician cards confirmed unchanged),
   `/calendar` (New Booking button, "Today" pill), `/settings` Clinic tab
   ("Save Clinic Settings" button, Branding section showing the real
   `#080075`/`#000480` values), `/settings` Appearance tab (Dark radio's
   selected border, read-only Accent Color display).
2. `clinician@medibook.dev` — `/clinician/dashboard` (greeting banner,
   "Add Block" button), `/clinician/calendar` ("This Week" pill, "Today"
   label).

All render the real org accent, not a fixed teal or Google-blue literal.
