---
id: TP232
type: bug
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: approved
parent: PLAN212
related: [BUG047, BUG044]
---

# TP232 — Test plan for PLAN212

| # | Case | Expected |
|---|---|---|
| 1 | Click the `AppShell` header "Dark mode" button on any page | Whole app (top bar, sidebar-adjacent chrome, page content, cards) switches to dark palette immediately |
| 2 | Reload after toggling dark | Dark mode persists |
| 3 | Toggle dark via the header, then open Settings → Appearance | Theme radio shows "Dark" selected — same shared state, not two disconnected toggles |
| 4 | Toggle "Light"/"Dark"/"System" from Settings → Appearance | Applies immediately app-wide, no Save click needed |
| 5 | Dashboard in dark mode | Header greeting card and the 4 KPI cards render with dark surfaces and legible text — no stray white cards |
| 6 | Settings page in dark mode | "Settings" `h4` heading and its subtitle are legible, not near-invisible dark-grey-on-dark |
| 7 | `theme/theme.js` | Deleted; no remaining import anywhere in `frontend/src` |
| 8 | `npx eslint` on every touched file | 0 new errors |
| 9 | `npx jest src/pages/settings/index.test.jsx` in isolation | 9/9 pass |
| 10 | `npm run build` | Succeeds |

## Part 2 — backend sync + Phase 1 colour sweep

| # | Case | Expected |
|---|---|---|
| 11 | GraphQL introspection: `{ __type(name: "MyProfile") { fields { name } } }` | `theme_mode` present |
| 12 | Toggle dark as `admin@medibook.dev`, then query `{ myProfile { theme_mode } }` via an authenticated `fetch()` | Returns `"dark"` — the backend genuinely persisted it, not just localStorage |
| 13 | Clear `localStorage['medibook_appearance_prefs']`, reload | Page loads in dark mode, hydrated from the backend value — the "new device" scenario |
| 14 | Same reload | `localStorage` is repopulated with `{"themeMode":"dark"}` after hydration |
| 15 | `account.service.spec.ts` | `theme_mode` round-trips; returns `undefined` (not `null`) when never set |
| 16 | `context/ThemeContext.test.jsx` (new) | `setMode` fires `updateMyProfile` only when a session exists; hydrates on first mount only when no local pref exists; never overrides an existing local pref |
| 17 | `npx eslint src/pages src/components src/layouts` | Project-wide "theme token" warning count decreases from the pre-Phase-1 baseline |
| 18 | `npx eslint` on every file touched in the Phase 1 sweep | 0 new errors |
| 19 | `npx jest src/components` and `npx jest src/layouts` | All suites pass |
| 20 | Existing suites for touched files with dedicated tests (`StitchKpiCard`, `RoleGuard`, `NotificationBell`, `PublicLayout`, `settings/index`) | All pass in isolation |
| 21 | Patient dashboard at 360px viewport, dark mode | Greeting card, stat tiles, and bottom nav all render with dark-correct surfaces — no stray white |
| 22 | Appointments list, any role | `StatusChip` chips render via MUI's real `color` prop (unaffected, already token-correct) |
| 23 | `npm run build` (Phase 1 state) | Succeeds |

## Part 3 — Phase 2 of the colour sweep (patient/guest, mobile-first)

| # | Case | Expected |
|---|---|---|
| 24 | `npx eslint` on all 9 Phase 2 files | 0 new errors |
| 25 | Project-wide colour-warning count | Decreases further from the Phase 1 result |
| 26 | `login.jsx` no longer references a deleted `BRAND`/`TEAL`-style constant anywhere | Lint reports no undefined-variable errors |
| 27 | `patient/Appointments.test.jsx`, `auth/reset-password.test.jsx`, `booking/index.test.jsx`, `patient/Family.test.jsx` | All pass |
| 28 | Login page, dark mode | Brand panel (left) unchanged; form panel/tabs/inputs (right) render with dark surfaces |
| 29 | Public landing page, dark mode | Header bar, hero search card, filters sidebar, and doctor-result cards all render correctly, no stray white |
| 30 | `npm run build` | Succeeds |
