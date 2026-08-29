---
id: TR241
type: bug
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: done
parent: TP241
related: [PLAN221]
commit: pending
---

# TR241 — Org accent color doesn't cascade everywhere it should

## Unit tests

| Suite | Result |
|---|---|
| `layouts/AppShell.test.jsx` (new) | 1/1 pass |
| `pages/appointments/index.test.jsx` | 4/4 pass (1 new + 3 pre-existing P1-17) |
| `pages/clinician/Dashboard.test.jsx` | 6/6 pass (1 new + 5 pre-existing BUG021) |
| `context/ThemeContext.test.jsx` | 9/9 pass (extended for `secondaryColor`) |
| `pages/settings/index.test.jsx` | 12/12 pass in isolation; 1 pre-existing test (`webhook delivery log (A-8) — shows a real empty state`, unrelated to this change) timed out under full 6-suite parallel contention and passed cleanly (10.2s) re-run alone — confirmed pre-existing resource-contention flakiness matching this codebase's own documented pattern, not a regression |
| `components/shared/StitchKpiCard.test.jsx` | 9/9 pass |

Consolidated run (6 suites, `--maxWorkers=2`): 35/36 pass, the one failure
reproduced as isolation-only flakiness above, re-confirmed passing.

## Static checks

- `npx eslint` across every touched file (`layouts/AppShell.jsx`,
  `App.jsx`, `pages/calendar/index.jsx`, `pages/appointments/index.jsx`,
  `pages/appointments/detail.jsx`, `pages/dashboard/index.jsx`,
  `pages/clinician/Dashboard.jsx`, `pages/patient/Dashboard.jsx`,
  `pages/clinician/Calendar.jsx`, `components/shared/StitchKpiCard.jsx`,
  `components/shared/DoctorCard.jsx`, `pages/settings/index.jsx`,
  `pages/admin/users/form.jsx`, `pages/manager/clinics/{detail,create,
  edit}.jsx`, `pages/manager/rooms/{create,edit}.jsx`, `theme/index.js`,
  `context/ThemeContext.jsx`, plus every new/touched test file): **0
  errors, 0 `no-hardcoded-colors` warnings**.
- `npm run build`: succeeds, no compile errors.
- `npm run size`: all three budgets green —
  initial bundle 329.8 kB / 350 kB limit,
  largest lazy chunk (charts) 109.92 kB / 115 kB limit,
  initial CSS 13.59 kB / 18 kB limit.

## Live verification (Chrome DevTools MCP, real dev stack)

Real accounts on **"City Heart Clinic Group"** (`primary_color: #080075`,
`secondary_color: #000480`, confirmed by direct `psql` lookup, not
assumed):

**`manager@medibook.dev`**
- `/manager/dashboard` — sidebar header gradient (behind the org's real
  logo/name), "+" and theme-toggle icons: all render `#080075`-derived
  purple, not teal.
- `/appointments` — "New Booking" button and the floating "+" FAB both
  render the org accent (the FAB was the exact Google-blue bug from the
  user's screenshot — confirmed fixed).
- `/appointments/:id` — the primary action button and both fixed summary
  cards (Patient card top stripe, right-column "Appointment Details" card)
  render accent-toned; the Assigned Clinician card (green) and Patient
  Timeline card (amber) confirmed **unchanged** — the deliberate exclusion
  holds.
- `/calendar` — "New Booking" button and the "Today" pill both
  accent-toned.
- `/settings` Clinic tab — "Save Clinic Settings" button (the exact button
  from the user's screenshot) now accent-toned; Branding section confirmed
  showing the real `#080075`/`#000480` swatches, unaffected.
- `/settings` Appearance tab — the Dark theme radio's selected border is
  accent-toned; the read-only Accent Color field correctly shows `#080075`
  with a "Change in Branding →" link (BUG051's own fix, unregressed).

**`clinician@medibook.dev`**
- `/clinician/dashboard` — the greeting banner (previously fixed teal) now
  renders the real `#080075` accent; "Add Block" button also accent-toned.
- `/clinician/calendar` — the "This Week" pill and "Today" label both
  accent-toned.

Every fixed surface renders the real org accent; every deliberately
excluded surface (the three semantic detail-page cards, the Branding
color-picker swatches themselves) renders unchanged, confirming the fix is
neither under- nor over-applied.
