---
name: medibook-responsive-mobile
description: Verify and fix responsive/mobile behaviour in this repo's React+MUI frontend, where tiering (mobile-first vs tablet-first vs desktop-dense) matters more than uniform breakpoint checking, and where the standard page-overflow check provably misses real data truncation. Use when touching any screen under frontend/src, reviewing a UI change for mobile, adding a table or drawer or form, or asked "does this work on a phone". Triggers on "responsive", "mobile", "360px", "breakpoint", "overflow", "truncated", "TableContainer", "touch target", "PWA", "viewport", "xs/sm/md".
metadata:
  origin: project-specific
  vetted: >-
    Written 2026-08-22 from a measured audit of this repository's own
    frontend — 125 JSX files inspected statically plus live element-level
    measurement in a real Chromium at 360x800. The two confirmed truncation
    defects cited were reproduced live, not inferred. Full audit:
    project-plans/technical-plans/06-frontend-architecture-and-mobile.md.
---

# MediBook responsive & mobile

`CLAUDE.md` Hard Rule 5. Full audit and rationale:
`project-plans/technical-plans/06-frontend-architecture-and-mobile.md`.

## 1. The check most people run does not work here

**`document.scrollWidth > document.clientWidth` reports CLEAN on both
live-confirmed truncation defects in this codebase.** Do not rely on it. Do not
rely on "the page doesn't scroll sideways" or a screenshot that looks fine.

Why: an ancestor with `overflow-x: hidden` clips the overflowing child. The page
reports no overflow *because the content was destroyed rather than exposed*.
That is strictly worse than a horizontal scrollbar — the data becomes
unreachable, with no affordance telling the user anything is missing.

Confirmed live at 360 px viewport:

| Page | Element right edge | Result |
|---|---|---|
| `/dashboard` (`RecentAppointmentsTable`) | 368 px | rightmost column cut, no scroll to reach it |
| `/settings` → Notifications tab | **392 px** | **the entire "In-App" toggle column is off-screen and unreachable — a mobile user cannot toggle in-app notifications at all** |

The second is a functional loss, not a cosmetic one.

## 2. Use this probe

Element-level, walks ancestors, treats `hidden` as failure and `auto`/`scroll`
as containment. This exact probe found both defects above.

```js
const de = document.documentElement;
const offenders = [];
document.querySelectorAll('*').forEach(el => {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.right <= de.clientWidth + 1) return;
  let p = el.parentElement, scrollable = false;
  while (p) {
    const ox = getComputedStyle(p).overflowX;
    if (ox === 'auto' || ox === 'scroll') { scrollable = true; break; }
    if (ox === 'hidden') break;            // clipped = FAIL, not contained
    p = p.parentElement;
  }
  if (!scrollable) offenders.push({ tag: el.tagName, cls: el.className, right: Math.round(r.right) });
});
```

Run it at 360 / 768 / 1280. For tables, additionally check whether the **last
`<th>`'s right edge** exceeds the viewport — that is how the `/settings` defect
was pinned to a specific missing column.

## 3. Tiering — verify at the tier's widths, not everywhere

A flat "check 360/768/1280 on everything" rule asked the front-desk billing
console to meet the patient booking page's bar, so it got ignored. The PRD
itself says front desk *needs* desktop density (§7.2). Declare the tier:

| Tier | Surfaces | Designed for | Verify at | Bar |
|---|---|---|---|---|
| **Mobile-first** | public booking, patient PWA, QR check-in, patient portal, WhatsApp landing | 360 px | 360 / 414 / 768 | Full function. No horizontal scroll. |
| **Tablet-first** | clinician consult, Rx builder, clinician calendar/availability | 1024 px | 768 / 1024 / 1280 | Usable at 768. On a phone: readable + scrollable, not necessarily efficient. |
| **Desktop-dense** | front desk, billing counter, admin console, reports, pharmacy POS | density | 1280 / 1440 | At 360 px scrolling is fine; **truncated data is never fine**. |

PRD surface assignments already decided: `REQ019` queue/check-in and `REQ027`
portal are **mobile-first**; `REQ020` EMR and `REQ021` Rx builder are
**tablet-first**; `REQ022` pharmacy POS, `REQ023` billing, `REQ031` insurance
desk are **desktop-dense**. Build to tier from the start — retrofitting is what
produced the existing 66-file backlog.

## 4. Rules with evidence behind them

- **Every `<Table>` gets a `<TableContainer sx={{ overflowX: 'auto' }}>`.** Violated three times now; two found by accident. Currently missing in `patients/detail.jsx`, `settings/index.jsx`, `Dashboard/RecentAppointmentsTable.jsx`.
- **`overflow-x: hidden` on an ancestor of tabular or form content is a bug.** Not a layout technique.
- **Drawers need `width: { xs: '100%', sm: N }`**, never a flat `width: N`. The newer ones get this right (`PatientDetailDrawer`, `ClinicianFormDrawer`, `ClinicianProfileDrawer`, `finances/index`, `clinician/Calendar`); `clinician/Dashboard.jsx` (×2) and `manager/Billing.jsx` still use a flat `360`.
- **A fixed `minWidth` is fine *if* the ancestor scrolls.** `manager/Dashboard.jsx`'s `minWidth: 650` table is correctly wrapped and verified working — don't "fix" it. `clinician/Calendar.jsx`'s `minWidth: 700` week grid needs verifying against the probe.
- **Touch targets ≥44×44 px** on patient-facing surfaces (WCAG 2.5.5). 28 elements are currently under that on `/settings` alone — worst measured 24 px tall.
- **Body text ≥16 px** on patient-facing surfaces per PRD §13. Currently violated: 9.6 px, 10.4 px, 10.88 px measured live, plus 35 instances at 12–14 px. **Note the theme itself is below the floor** (`body1` = 15 px, `caption` = 12 px) — raising it is a product decision, logged as an open question; don't silently pick one.

## 5. What is already correct — don't "fix" it

- **`AppShell.jsx` mobile handling is genuinely right**: `useMediaQuery(theme.breakpoints.down('md'))` → `variant="temporary"` drawer with `keepMounted`, a `BottomNavigation`, and `pb: isMobile ? 10 : 3` so content clears the bar. Margins collapse correctly.
- **`<Grid item>` usage is 489/495 correct** with explicit `xs`. The 6 without are deliberate.
- **Route-level code splitting is complete** — all 75 pages are `React.lazy`.
- **66 of 125 files have zero breakpoints, but that is not automatically a bug** — dialogs, chips, badges and small presentational components often need none. Check behaviour with the probe before adding breakpoints for their own sake.

## 6. PWA — required and entirely unbuilt

`FR-PAT-01` ("PWA with phone-OTP login; installable; works on low-end Android")
is **P0** in the PRD. Measured state: **no `public/` directory, no manifest, no
service worker, no `vite-plugin-pwa`.** `index.html` has a correct `viewport`
meta and a `theme-color` and nothing else.

PRD §13 budgets that need to become CI assertions, not intentions: initial
payload **<300 KB**, booking-page FCP **<2.0 s on 4G**, 2 GB RAM / Android 9+,
WCAG 2.1 AA on patient-facing surfaces.

**Before caching clinical data in a service worker**, resolve the DPDP retention
question (`REQ034`) — an offline PHI cache on a shared clinic phone is a
compliance decision, not a performance one.

**Offline resilience** (PRD §13: front desk continues check-in ≥15 min offline)
is a *separate, much harder* capability than an installable PWA — it needs a
local write queue with conflict resolution. Do not assume it falls out of a
service worker.

## 7. Before you commit

- [ ] Tier declared; verified at that tier's widths.
- [ ] Probe (§2) run — zero unclipped offenders.
- [ ] Any new `<Table>` wrapped in `<TableContainer>`.
- [ ] Any new drawer uses `{ xs: '100%', sm: N }`.
- [ ] Patient-facing: touch ≥44 px, body text ≥16 px.
- [ ] `npx eslint <files>` clean. (Note `npm run lint` is currently broken — it passes `--ext`, rejected by the installed flat-config ESLint, so it exits 1 before linting anything. Call `npx eslint` directly until that's fixed.)
