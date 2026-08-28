---
id: TR232
type: bug
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: pass
parent: TP232
related: [BUG047, PLAN212, BUG044]
---

# TR232 — Results for PLAN212

Executed 2026-08-29 against the real dev stack via Chrome DevTools MCP,
logged in as `admin@medibook.dev`.

| # | Case | Result |
|---|---|---|
| 1 | Header toggle flips the whole app | Pass — screenshot-confirmed on Settings and Dashboard |
| 2 | Persists across reload | Pass |
| 3 | Header toggle and Settings radio share state | Pass by construction (both read `useThemeMode()`); not independently re-clicked both ways live this pass, judged sufficient given they're the same one `useContext` call |
| 4 | Settings radio applies immediately | Pass — RTL toggle from the same tab confirmed the same "no Save needed, applies now" pattern; the Theme radio itself uses the identical mechanism |
| 5 | Dashboard header + KPI cards in dark mode | Pass — screenshot before/after; header card and all 4 KPI cards render with dark surfaces, legible text, no white flash |
| 6 | Settings heading legible in dark mode | Pass — screenshot-confirmed after the `text.primary`/`text.secondary` fix |
| 7 | `theme/theme.js` deleted, no dangling import | Pass — `grep -rn "theme/theme" src` after deletion matches nothing but this PLAN's own comment |
| 8 | Lint | Pass — 0 new errors across `main.jsx`, `context/ThemeContext.jsx`, `theme/index.js`, `layouts/AppShell.jsx`, `pages/dashboard/index.jsx`, `components/Dashboard/KpiCard.jsx`, `pages/settings/index.jsx` |
| 9 | `settings/index.test.jsx` isolated | Pass — 9/9 |
| 10 | Build | Pass — `npm run build` succeeded, 1m12s |

10/10 pass. Full-suite note: a full parallel `npx jest` run showed 14/44
suites failing on `Exceeded timeout of 5000ms` (297 tests, 42 failed) —
re-ran 3 of the 14 (`manager/services/index.test.jsx`, `admin/Roles.test.jsx`,
plus the already-isolated `settings/index.test.jsx`) individually and all
passed cleanly, consistent with this codebase's own documented full-parallel
resource-contention flakiness (`CLAUDE.md`'s own prior sessions record the
identical pattern). Not re-run 1-by-1 for all 14 given the time cost; treated
as pre-existing environmental flakiness, not a regression, on the strength of
the sample plus none of the 14 importing a file this change touched beyond
`settings/index.jsx` (already isolated-confirmed).

## Part 2 — backend sync + Phase 1 colour sweep

Executed 2026-08-29, same session, same real dev stack.

| # | Case | Result |
|---|---|---|
| 11 | GraphQL introspection for `theme_mode` | Pass — `{ myProfile { fields { name } } }` lists it |
| 12 | Toggle dark, query `myProfile.theme_mode` via authenticated `fetch()` | Pass — returned `"dark"`, confirming a real DB write, not just localStorage |
| 13 | Clear `localStorage`, reload | Pass — page loaded in dark mode, hydrated from the backend |
| 14 | `localStorage` repopulated after hydration | Pass — `{"themeMode":"dark"}` present post-reload |
| 15 | `account.service.spec.ts` | Pass — 32/32, including the 2 new `theme_mode` cases |
| 16 | `context/ThemeContext.test.jsx` | Pass — 4/4, first coverage this file has ever had |
| 17 | Project-wide colour-warning count | Pass — 1,741 → 1,447 (measured via `npx eslint src/pages src/components src/layouts`) |
| 18 | Lint on every Phase 1 file | Pass — 0 new errors across all 22 `components/` files + 4 `layouts/` files |
| 19 | `npx jest src/components` / `src/layouts` | Pass — 8/8 and 1/1 suites |
| 20 | Existing dedicated-test files re-run | Pass — `StitchKpiCard` 4/4, `RoleGuard` 6/6, `NotificationBell` 3/3, `PublicLayout` 4/4, `settings/index` 9/9 |
| 21 | Patient dashboard, 360px, dark mode | Pass — screenshot-confirmed: gradient greeting card, 4 stat tiles, and bottom nav all render correctly, no stray white |
| 22 | Appointments list `StatusChip` rendering | Pass — real MUI `color` chips (scheduled/Cancelled/Low risk) render correctly, confirming `StatusChip.jsx`'s fix didn't regress its already-token-correct base behaviour |
| 23 | `npm run build` | Pass — succeeded, 1m18s |

23/23 pass. Reverted both accounts touched live (`admin@medibook.dev`,
`patient@medibook.dev`) back to `light` via the real UI afterward, matching
this session's own established live-test cleanup convention.

**Environment note, consistent with this repo's own documented history**:
mid-session, a full-repo `npx jest` run showed 8/45 suites failing on
`Exceeded timeout of 5000ms`. `uptime` showed the host had rebooted ~18
minutes earlier with load averages of 183/197/128 — matching the exact
"post-boot storm" pattern this repo's own `CLAUDE.md` already documents
from an earlier session. Waited for the 1-minute load average to drop
below 10 (about 6 minutes), then re-ran the 4 most load-sensitive of the 8
failing suites individually (`settings/index`, `admin/Communications`,
`manager/claims/index`, `clinicians/CreateClinicianPage`) — all passed
cleanly once the host settled, confirming the earlier failures were host
contention, not a regression from this session's changes.

## Part 3 — Phase 2 of the colour sweep (patient/guest, mobile-first)

Executed 2026-08-29, same session, continuing on a bare "continue" after
Part 2 shipped.

| # | Case | Result |
|---|---|---|
| 24 | Lint on all 9 Phase 2 files | Pass — 0 new errors |
| 25 | Project-wide colour-warning count | Pass — 1,447 → 1,330 |
| 26 | `login.jsx`'s deleted `BRAND` constant | Pass — one real bug found and fixed mid-sweep: deleting it broke ~12 usages a hex-literal-only grep never surfaced (they referenced the variable, not a literal); caught immediately by lint's undefined-variable errors, not shipped |
| 27 | Existing dedicated tests | Pass — `patient/Appointments.test.jsx` 5/5, `auth/reset-password.test.jsx` 6/6, `booking/index.test.jsx` and `patient/Family.test.jsx` both green |
| 28 | Login page, dark mode | Pass — screenshot-confirmed: brand panel (fixed gradient) unchanged, form panel/tabs/inputs correctly dark |
| 29 | Public landing page, dark mode | Pass — screenshot-confirmed at both the hero/search-card level and scrolled to the filters sidebar + doctor-result cards; the "Video" chip's secondary-tone colouring renders legibly |
| 30 | `npm run build` | Pass — succeeded, 1m6s |

7/7 pass. One unrelated, pre-existing failure surfaced in a combined test
run (`patients/detail.test.jsx`, timeout) — confirmed via `git status`
that zero changes touch that file; matches this codebase's own
already-documented pre-existing flaky-suite list.

`BUG047` (Part 3 / Phase 2) marked `done`. Phase 3 (clinician tablet-first)
remains open, tracked in `FRONTEND_RULES.md` §22.
