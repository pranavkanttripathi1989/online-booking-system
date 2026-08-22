---
id: TECH007
type: technical-plan
feature: technical-plans
created: 2026-08-22
updated: 2026-08-22
status: active
parent: TECH000
related: [TECH001, TECH002, TECH003, TECH006]
---

# 06 — Frontend architecture, mobile/responsive, and design system

Covers **both** the frontend as it exists today (75 pages, 47 components) and
the frontend surface the CareOS PRD adds (`REQ014`–`REQ035`). Every number and
defect below was measured in this session — statically over the source, and
live in a real Chromium at a 360×800 mobile viewport. Nothing is inferred.

## 1. Measured state

| Metric | Measured |
|---|---|
| JSX files (pages + components + layouts) | 125 |
| Files with **zero** responsive breakpoints (`xs:`/`sm:`/`md:`/`lg:`) | **66 / 125** |
| `<Grid item>` usages with an explicit `xs` | 489 / 495 (the 6 without are deliberate) |
| `<Table>` without a `TableContainer` wrapper | **3** (`patients/detail`, `settings/index`, `Dashboard/RecentAppointmentsTable`) |
| Files hardcoding hex colours | **87 / 122** (pages + components) |
| Distinct hardcoded colour literals | 72 unique; `#006D77` alone appears **264 times** |
| PWA infrastructure (manifest, service worker, `public/`) | **none — zero files** |
| i18n framework | **none** |
| Touch targets < 44 px on one page (`/settings`) | **28** |
| Text rendering below 12 px | confirmed: 9.6 px, 10.4 px, 10.88 px |

### What is already correct — protect this during any refactor

- **`AppShell.jsx` mobile handling is genuinely right.** `useMediaQuery(theme.breakpoints.down('md'))` drives a `variant="temporary"` drawer with `keepMounted`, a `BottomNavigation` bar, and `pb: isMobile ? 10 : 3` so content clears it. Margin/width collapse correctly (`ml: isMobile ? 0 : DRAWER_WIDTH`).
- **A real theme exists** (`theme/theme.js`): a named `COLORS` palette wired into `primary`/`secondary`/`success`/`warning`/`error`, plus a complete `h1`–`overline` typography scale. The hardcoded-hex problem below is not "no design system" — it is **87 files bypassing a system that already exists**, which is a different and more tractable problem.
- **Newer drawers are responsive**: `PatientDetailDrawer`, `ClinicianFormDrawer`, `ClinicianProfileDrawer` all use `width: { xs: '100%', sm: 480|520 }`; `finances/index` and `clinician/Calendar` use `{ xs: '100vw', sm: 400|420 }`.
- **Route-level code splitting** is complete — all 75 page modules are `React.lazy`.

**The pattern across the codebase is chronological, not random:** components written later are responsive; the older ones are not. Treat this as a backlog with a known shape, not an unknown-scope rewrite.

## 2. Confirmed defects (live-verified, not inferred)

### F-FE-01 · S2 · Data silently truncated on mobile by `overflow-x: hidden`

The most important finding here, because it is **invisible to the check most
people run** ("does the page scroll sideways?").

Measured at 360 px viewport:

| Page | Table right edge | Viewport | Clipped by | Result |
|---|---|---|---|---|
| `/dashboard` (`RecentAppointmentsTable`) | 368 px | 360 px | ancestor `MuiPaper` `overflow-x: hidden` | rightmost column cut, **no scroll to reach it** |
| `/settings` → Notifications tab | **392 px** | 360 px | ancestor `MuiPaper` `overflow-x: hidden` | the **entire "In-App" column is off-screen and unreachable** |

`document.scrollWidth - clientWidth === 0` on both pages — so a page-level
overflow check reports *clean* while data is being destroyed. On `/settings`
this is a **functional loss, not cosmetic**: a mobile user cannot toggle
in-app notifications at all, because the control does not exist on their
screen and cannot be scrolled to.

This is the same bug class already found and fixed once in `staff/index.jsx`
(missing `TableContainer`, surfaced only when real data proved wider than mock
data). It recurred because nothing enforces the fix.

**Fix:** wrap all three in `<TableContainer sx={{ overflowX: 'auto' }}>`. Then
add the lint rule in §6 so a fourth instance cannot ship.

### F-FE-02 · S2 · No PWA infrastructure, but `FR-PAT-01` is P0

`FR-PAT-01` ("PWA with phone-OTP login; installable; works on low-end
Android") is **P0 — MVP-blocking** in the PRD. The measured state is zero:
no `public/` directory, no `manifest.webmanifest`, no service worker, no
`vite-plugin-pwa`. `index.html` has a correct `viewport` meta and a
`theme-color`, and nothing else.

This is not a small gap. "Installable" and "works on low-end Android" imply a
manifest, an offline-capable service worker, an icon set, and a measured
bundle budget — none of which exist. See §4.

### F-FE-03 · S3 · Touch targets below the 44 px minimum

28 interactive elements under 44 px on `/settings` alone. Worst measured:
the header search button (30×30), dark-mode toggle (29×29), and notification
preference checkboxes (24 px tall). WCAG 2.5.5 and both platform HIGs put the
floor at 44 px; the PRD commits to WCAG 2.1 AA for patient-facing surfaces
(§13).

At a clinic front desk this is a throughput problem, not just compliance: the
PRD's own hard requirement is booking an appointment in **≤4 interactions**
(§5, P5) — every mis-tap is a wasted interaction.

### F-FE-04 · S3 · Type rendering below the PRD's own 16 px floor

PRD §13 states "minimum 16 px base type". Measured live: 9.6 px, 10.4 px,
10.88 px, plus 35 separate instances between 12–14 px. The theme's own
`body1` is `0.9375rem` (15 px) and `caption` is `0.75rem` (12 px) — so the
theme itself sits below the committed floor before any component overrides it.

Either the theme scale moves up for patient-facing surfaces, or the PRD's
16 px commitment needs revising. **This is a product decision, not a CSS fix**
— flag it rather than silently picking one.

### F-FE-05 · S3 · 87 files bypass the existing theme

`#006D77` is written literally **264 times**. `#1A73E8` 101 times, `#5F6368`
99, `#202124` 82. All of these have theme-token equivalents already defined.

The direct consequence is that `REQ002`'s shipped org-branding feature
(logo + primary/secondary colour pickers, with real WCAG-AA contrast
validation server-side) **cannot actually re-theme the product**. An org sets
its brand colour and 87 files ignore it. White-labelling — a headline
differentiator in both the PRD (§4.3) and the competitive analysis — stops at
the app shell.

### F-FE-06 · S3 · Fixed-width drawers and tables that predate the responsive pattern

- `clinician/Dashboard.jsx` — two drawers at a flat `width: 360` (no `xs` breakpoint). At 360 px viewport that is a full-bleed drawer with no margin; below 360 px it overflows.
- `manager/Billing.jsx` — `<Box sx={{ width: 360 }}>` inside a drawer, same issue.
- `clinician/Calendar.jsx` — `<Box sx={{ minWidth: 700 }}>` for the week grid. Correct *if* the ancestor scrolls; verify, since this is exactly the F-FE-01 shape.
- `manager/Dashboard.jsx` — `<Table sx={{ minWidth: 650 }}>`. Verified live as correctly wrapped and scrollable — **this one is fine**, listed only so it isn't "fixed" unnecessarily.

### F-FE-07 · S3 · Apollo defaults hide failures and serve stale lists

`apollo/client.js` sets `fetchPolicy: 'cache-first'` and `errorPolicy: 'all'`
globally. Lists serve stale data after a mutation unless refetch is explicit,
and partial errors resolve as success. On mobile — where a flaky connection is
the norm, not the exception — this is the shape of failure that makes a broken
screen look merely empty. (Carried from `project-plans/02` F-21.)

### F-FE-08 · S4 · `npm run lint` is broken, so none of the above is enforced

Already logged as F-22: the script passes `--ext`, rejected by the installed
flat-config ESLint, so it exits 1 before linting anything. Behind that sit 12
real `jsx-a11y` errors. **Nothing in §6 works until this is fixed first.**

## 3. Competitive analysis — mobile and frontend specifically

Positioning below reflects how these products are generally understood in the
market; confirm current specifics before using any of it in sales material.

| Product | Mobile/frontend posture | What we should take from it |
|---|---|---|
| **Practo (Ray + consumer app)** | Polished consumer-grade patient app; clinic-side Ray is desktop-first. Patient app is Practo-branded. | Their patient app quality is the bar for our patient PWA. Their branding is our opening: white-label is a real wedge **only if F-FE-05 is fixed**. |
| **Eka Care** | Consumer-app-led, ABHA/PHR native, strong mobile UX. | Mobile-first patient identity (ABHA scan-and-share) is table stakes, not polish. Ties to `REQ028`. |
| **HealthPlix** | Doctor-centric, speed-of-documentation obsessed; desktop/tablet in-consult. | Validates the PRD's ≤90 s documentation constraint. Our clinician surfaces need tablet-density layouts, not phone-shrunk desktop. |
| **MocDoc / regional HMS** | Functional but dated UI; weak responsive behaviour. | This is the low bar most of the Indian mid-market currently tolerates — a genuinely good mobile experience is a visible differentiator here. |
| **Cliniko / Jane / SimplePractice** | The SMB product-quality reference. Clean responsive web, real native or PWA patient portals, consistent design systems. | Their consistency comes from actually enforcing a design system. Our 87-file bypass is precisely what they don't have. |
| **Zocdoc / NexHealth / Phreesia** | Mobile-first patient access, intake, and check-in. Phreesia's whole business is tablet/mobile intake. | Directly relevant to `REQ019` (queue/check-in) and `REQ027` (portal): QR self-check-in and pre-visit intake are **mobile-native by definition** — they cannot be desktop features with a responsive afterthought. |

**Three conclusions that change our plan:**

1. **Patient-facing surfaces must be mobile-first, not mobile-compatible.** The PRD's own channel list (§9 M5) is QR at reception, WhatsApp deep link, patient PWA — every one arrives on a phone. Building these desktop-first and shrinking them will lose to Practo and Eka Care on the only screen that matters.
2. **Staff-facing surfaces are legitimately desktop-dense** — the PRD says so explicitly ("front desk needs desktop density", §7.2). Do **not** spend effort making the front-desk billing console beautiful at 360 px. Make it *usable* (no data truncation) and stop.
3. **Clinician surfaces are tablet-first.** Between the two. `clinician/Calendar`'s 700 px week grid is correct for a tablet and should scroll, not restack, on a phone.

This tiering is the single most useful output of the competitive read, and it is what §5 is built on.

## 4. PWA and performance plan (`FR-PAT-01`, PRD §13)

Required by the PRD, entirely unbuilt. Scope:

```
frontend/public/manifest.webmanifest     # name, icons 192/512, display standalone, theme_color
frontend/public/icons/                   # maskable + any-purpose icon set
vite.config.js                           # + vite-plugin-pwa (workbox)
```

Budgets the PRD commits to, which must become CI assertions rather than intentions:

| Target | PRD source | How to enforce |
|---|---|---|
| Initial payload < 300 KB (low-bandwidth mode) | §13 | `rollup-plugin-visualizer` + a hard size-limit check in CI |
| Booking page FCP < 2.0 s on 4G | §13 | Lighthouse CI on the public booking route |
| Works on 2 GB RAM / Android 9+ | §13 | Lighthouse mobile profile + CPU throttling ×4 |
| WCAG 2.1 AA (patient-facing) | §13 | `axe-core` in CI on public routes |

**Caching strategy** (deliberate, not default): app shell precached;
GraphQL reads network-first with a short cache fallback; **never** cache
mutations. Clinical data (`REQ020`/`REQ021`) must not be written to a service-worker
cache without resolving the DPDP retention question (`REQ034`) first — an
offline cache of PHI on a shared clinic phone is a compliance question, not a
performance one. Flag it, don't default it.

**Offline resilience** (PRD §13: front desk continues check-in ≥15 min offline)
is a *separate and much harder* capability than an installable PWA. It needs a
local write queue with conflict resolution. Scope it as its own spike — it does
not fall out of a service worker, and `REQ019` already notes this.

## 5. Hard rules — frontend

Proposed additions to `CLAUDE.md`'s Hard Rules. Each one exists because
something above was measured, not because it's good practice in general.

### FE-1 · Responsive tiering, not uniform responsiveness
Every screen declares a tier and is verified at that tier's widths:

| Tier | Surfaces | Verify at | Standard |
|---|---|---|---|
| **Mobile-first** | public booking, patient PWA, QR check-in, patient portal, WhatsApp landing | 360 / 414 / 768 | Designed for 360 px. Full function, no horizontal scroll. |
| **Tablet-first** | clinician consult, Rx builder, clinician calendar/availability | 768 / 1024 / 1280 | Designed for 1024 px. Usable at 768. Phone: readable + scrollable, not necessarily efficient. |
| **Desktop-dense** | front desk, billing counter, admin console, reports, pharmacy POS | 1280 / 1440 | Designed for density. At 360 px: **no truncated data** — scroll is acceptable, silent clipping is not. |

Replaces the current flat "check 360/768/1280" rule, which asks the billing
console to meet the same bar as the patient booking page and therefore gets
ignored.

### FE-2 · No silent truncation, ever
Any element wider than its container must scroll, not clip. **`overflow-x: hidden` on an
ancestor of tabular or form content is a bug** (F-FE-01). Every `<Table>` is
wrapped in `<TableContainer>`. This is the rule with the most evidence behind
it: it has now been violated three times, found twice by accident.

**Verification is not "does the page scroll sideways?"** — that check passes on
both confirmed defects. Use the element-level probe in §7.

### FE-3 · Theme tokens only — no colour literals
No `#RRGGBB` in `pages/`, `components/`, or `layouts/`. Use theme tokens or
`theme.palette.*`. Enforced by lint (§6). Rationale: `REQ002`'s branding
feature is inert until this holds (F-FE-05).

### FE-4 · Type and touch floors
Patient-facing: **≥16 px** body text, **≥44 × 44 px** touch targets. Staff-facing
may go denser but never below 14 px / 36 px. Any `fontSize` under `0.875rem`
needs a comment justifying it.

### FE-5 · Every screen fetches its own data
No page renders a hardcoded array or `useState([])` where a backend exists.
This is F-18 restated as a rule, and it is enforced structurally in §6 —
because four separate grep-based audits walked past the same 14 pages.

### FE-6 · Contract fidelity (unchanged, restated)
Read the consuming page's `gql` verbatim before changing a resolver. Two
dialects and three mutation-response conventions coexist deliberately — see
`05-cross-cutting-conventions.md` §2–3 and the `medibook-graphql-contracts` skill.

## 6. Enforcement — CI gates, not review discipline

None of §5 survives without automation. Each gate maps to a specific defect
that review already failed to catch.

| Gate | Catches | Implementation |
|---|---|---|
| Fix `npm run lint` (drop `--ext`, add `eslint-plugin-react`) | F-FE-08 — **prerequisite for everything else** | script + flat-config change |
| `no-restricted-syntax` on hex colour literals | F-FE-05 | ESLint rule, `pages`/`components`/`layouts` |
| Custom rule: `<Table>` requires `TableContainer` ancestor | F-FE-01 | ESLint rule |
| Structural: page renders a list/detail view with no GraphQL reference | F-18 / FE-5 | ~10-line script in CI |
| `jsx-a11y` errors fail the build | F-FE-03 / F-FE-04 | already available, currently unreachable behind F-FE-08 |
| Playwright overflow probe across all routes × 3 widths | F-FE-01, F-FE-06 | §7 |
| Lighthouse CI + bundle-size limit on public routes | F-FE-02, PRD §13 budgets | new CI job |

## 7. The overflow probe — use this, not a visual check

Element-level, catches clipped-and-unreachable content that a page-level
`scrollWidth` check reports as clean. This exact probe found both F-FE-01
defects:

```js
// Fails if any element escapes the viewport WITHOUT a scrollable ancestor.
const de = document.documentElement;
const offenders = [];
document.querySelectorAll('*').forEach(el => {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.right <= de.clientWidth + 1) return;
  let p = el.parentElement, scrollable = false;
  while (p) {
    const ox = getComputedStyle(p).overflowX;
    if (ox === 'auto' || ox === 'scroll') { scrollable = true; break; }
    if (ox === 'hidden') break;            // hidden = clipped = FAIL, not contained
    p = p.parentElement;
  }
  if (!scrollable) offenders.push({ tag: el.tagName, cls: el.className, right: r.right });
});
```

Wire into Playwright as an `afterEach` across the route list at 360 / 768 / 1280.

## 8. Sequencing

**Fix first (days, high value, all confirmed):**
1. F-FE-08 — repair lint. Nothing else is enforceable until this lands.
2. F-FE-01 — three `TableContainer` wrappers + the ESLint rule + the probe. Closes a live functional loss on `/settings`.
3. F-FE-06 — four fixed-width drawers/boxes.

**Then (Phase F/1 alongside backend work):**
4. F-FE-05 — theme-token sweep. Mechanical, 87 files, lint-guarded afterward. Unblocks `REQ002`.
5. F-FE-03 / F-FE-04 — touch and type floors on patient-facing routes first. **Escalate the 16 px-vs-theme conflict as a product decision.**
6. F-FE-07 — Apollo cache policy.

**Then (Phase 1–2, with the features they serve):**
7. F-FE-02 — PWA manifest + service worker + CI budgets, with `REQ027`.
8. i18n framework, with `REQ027`'s multi-language requirement (English + Hindi + 6 regional at GA). No framework exists today — this is a dependency decision, not a translation task.
9. Offline resilience spike, with `REQ019`.

**New PRD surfaces — build to tier from the start (§5 FE-1):**
`REQ019` queue/check-in and `REQ027` portal are **mobile-first**; `REQ020` EMR
and `REQ021` Rx builder are **tablet-first**; `REQ022` pharmacy POS, `REQ023`
billing, and `REQ031` insurance desk are **desktop-dense**. Retrofitting a tier
after the fact is what produced the 66-file backlog above.

## 9. Open questions

- **The 16 px floor conflicts with the shipped theme** (`body1` = 15 px, `caption` = 12 px). Raise the scale for patient-facing surfaces, or revise the PRD's §13 commitment? Product decision.
- **PWA offline caching of clinical data** intersects DPDP retention (`REQ034`). Needs a compliance answer before the service-worker strategy is finalised.
- **Which 6 regional languages at GA** (PRD §19.8, already open) — determines i18n scope and font-subsetting.
- **Native app vs PWA for clinicians** — PRD §7.2 mentions React Native for clinicians in Phase 2. Not scoped here; would change the tablet-first tier's implementation substantially.
