# FRONTEND HARD RULES
### MediBook / CareOS — Doctor / Clinic / Diagnostics SaaS
**Stack:** React 18 + Vite + Material UI v5 + Apollo Client · **Language:** JavaScript / JSX (no TypeScript — see BASE-3) · **Market:** India

**Surfaces:** `patient` (customer app) · `clinic` (front-desk dashboard) · `manager` (multi-branch) · `admin/superadmin`

**Version 2.0** · Rewritten for the real JS/JSX stack · Review: quarterly

---

## 0. HOW THIS DOCUMENT WORKS

- Every rule has a stable ID (`PERF-3`, `BOOK-7`). Reference the ID in PR reviews and commit messages. **IDs are stable across versions** — v1.0 references remain valid.
- **MUST / MUST NOT / NEVER** = hard rule. Breaking it fails code review. No exceptions without a written waiver.
- **SHOULD** = strong default. Deviating requires a one-line justification in the PR description.
- A rule you cannot test is not a rule. Every hard rule is enforceable by lint, CI, a script, or a five-second manual check.
- ⚖️ marks a legal/regulatory rule, written from general knowledge of Indian law. **Get them confirmed by counsel before launch.** Treat as "must be verified", not "verified".
- 🔜 marks a **conditional rule** — it governs a surface or capability that does not exist in the codebase yet (currently: the Capacitor mobile shell). It is not dead; it is the contract that applies the day that work starts. Do not delete it, and do not claim compliance with it.

**Waiver process:** open an issue titled `WAIVER: <RULE-ID>`, state the reason, the expiry date, and the ticket that removes the waiver. No waiver lives longer than one release. Standing waivers are listed in §22.

### What changed in v2.0

| Rule | v1.0 | v2.0 | Why |
|---|---|---|---|
| **BASE-3** | TypeScript `strict: true`, `any` banned | **JavaScript + JSX is the chosen language.** Safety comes from runtime validation at boundaries, not compile-time types | Deliberate stack decision. The codebase is 170 `.jsx` files with zero `.ts` — a TS migration is not planned |
| **ARCH-7** | "Validate API responses at runtime" (a supplement to TS) | **Promoted to the primary type-safety mechanism**, with zod as the named tool | With no compile-time checking, the boundary validator *is* the type system |
| **BASE-10** | — | New: prop contracts on shared components | Replaces the guarantee TS prop types would have given |
| **WV-1 … WV-18** | Hard rules | 🔜 **Conditional** — no Capacitor shell exists yet | Honest status; they bind the moment the shell is built |
| **ARCH-1 / ARCH-4** | Feature-folder organisation, per-surface bundles | Split into a **standard for new work** and a **documented deviation** for the existing tree | The built app is organised by file type; a 170-file reorganisation is its own project |
| Tooling names | pnpm, generic bundler | npm, Vite, the real `package.json` scripts | Match reality so the rules are runnable |

---

## 1. MARKET CONTEXT — WHY THESE RULES EXIST

Operating assumptions the rules derive from. Validate against real analytics within 90 days of launch and revise if reality differs.

| Constraint | What it means for the frontend |
|---|---|
| Android dominates; many devices are budget phones with 3–4 GB RAM and weak single-core CPUs | JS execution time, not download time, is usually the bottleneck. Budget CPU, not just KB. |
| Network is spiky, not just slow — lifts, basements, waiting rooms, tier-2/3 towns, commutes | Every network call must assume it can hang, fail, or arrive twice. Offline is a normal state, not an error state. |
| Data is cheap but not free; users notice heavy apps | Ship less. Images are the biggest offender. |
| A large majority of users are more comfortable in an Indian language than in English | English-only is a growth ceiling, not a v2 nice-to-have. Architect for it now even if you ship English first. |
| Healthcare bookings carry anxiety and low trust | Every screen must answer: what will this cost, is this doctor real, can I cancel, who sees my data. |
| UPI is the default payment reflex. Cards are the minority. Cash-at-clinic is still huge | Pay-at-clinic MUST be a first-class option, not a hidden fallback. |
| Indian clinics run late. A 4:00 PM slot rarely means 4:00 PM | Never show a bare confirmed time and walk away. Surface queue position / expected wait. **The single biggest trust differentiator in this vertical.** |
| OTP is the login reflex; passwords are friction | Phone + OTP is the primary auth for patients. |
| Family bookings are the norm — one phone books for parents, spouse, children | Multi-patient profiles under one login are a launch requirement, not a v2 feature. |

---

## 2. TECH BASELINE — NON-NEGOTIABLE

- **BASE-1** 🔜 — The web app and any mobile app MUST be **one codebase, one build, one deployed bundle**. No `if (isMobileApp)` forks of a whole screen. Platform differences are handled by a single `platform` adapter module and CSS, nothing else.
- **BASE-2** 🔜 — All native access MUST go through one wrapper directory (`src/platform/`). No component, hook, or page may import a native plugin directly. Every wrapper exports a web fallback so the browser build never crashes.
- **BASE-3** — **The frontend is JavaScript with JSX. This is a deliberate decision, not debt.** There is no TypeScript and no TS migration planned. Because there is no compile-time type check, the following are **mandatory compensating controls** and are not optional:
  - **(a)** Every external data boundary is validated at runtime — see **ARCH-7**. This is the type system.
  - **(b)** Shared components and hooks declare their contracts — see **BASE-10**.
  - **(c)** ESLint runs with zero errors and a warning ratchet that only ever decreases — see **CI-2**.
  - **(d)** No implicit truthiness on values that can legitimately be `0` or `''`. Compare explicitly (`x != null`, `x !== ''`). This is the most common real bug class JS gives you that TS would have caught.
  - **(e)** Optional chaining and nullish coalescing (`?.`, `??`) are the default for any value crossing a boundary. `a || b` on a numeric or string field is a bug when `0`/`''` is valid.
- **BASE-4** — No jQuery, no Bootstrap, no second UI kit, no second CSS framework, no second date library, no second HTTP/GraphQL client, no second state library. **One of each thing, forever.** Current canonical choices: **MUI v5** (UI), **Apollo Client** (server state), **dayjs** (dates), **zod** (validation), **react-hook-form** (forms), **notistack** (toasts), **TipTap** (rich text editing — see FORM-20). Adding a dependency in any of these categories requires an ADR in `/docs/adr/`.
- **BASE-5** — Any new dependency over **15 KB gzipped** requires written approval in the PR. Check with `npx bundle-phobia` or `size-limit` before adding.
- **BASE-6** — Lock the package manager and Node version (`.nvmrc`, `packageManager` field). Committed `package-lock.json`. CI installs with `npm ci` (frozen lockfile). No exceptions.
- **BASE-7** — Browserslist target MUST be pinned in `package.json` and MUST include the oldest Android WebView supported. Decide that floor, write it here, test on it. Do not let Vite's defaults decide the support matrix.
- **BASE-8** — Environment config comes from validated env vars parsed at boot (`import.meta.env` + a zod schema). The app MUST refuse to start with a clear console error if a required var is missing. **No `import.meta.env.X || 'https://fallback-prod-url'` anywhere.**
- **BASE-9** — No secrets, API keys, private keys, or admin credentials in frontend code or env vars shipped to the client. Anything in the bundle is public. A CI secret-scanning step MUST run on every PR.
- **BASE-10** — **Prop and return contracts are mandatory on shared code.** Every component in `src/components/`, every custom hook in `src/hooks/`, and every exported util MUST declare its contract via a JSDoc block (`@param`, `@returns`) **or** `propTypes`. Pick one per file and be consistent. Page-level components are exempt. This is the replacement for the prop typing TS would have provided — without it, a shared component's contract exists only in the reader's head.

---

## 3. PERFORMANCE BUDGETS — FAIL THE BUILD, NOT THE USER

Enforced numbers, not aspirations. Wire into CI while they're easy to hit.

### Bundle budgets
- **PERF-1** — Initial JS for the patient surface: **≤ 180 KB gzipped**, hard fail at 200 KB. Initial CSS ≤ 40 KB gzipped.
- **PERF-2** — Any single lazy route chunk: **≤ 100 KB gzipped**.
- **PERF-3** — Clinic/manager/admin dashboards get a separate budget (**≤ 350 KB gzipped** initial) because they are desktop-first. They MUST NOT share an initial bundle with the patient surface.
- **PERF-4** — Budgets enforced by `size-limit` in CI. A PR that exceeds budget **fails**. Raising a budget number is a separate PR reviewed by the tech lead.

### Field / lab metrics (patient surface, mid-tier Android, throttled 4G)
- **PERF-5** — LCP ≤ **2.5 s** · INP ≤ **200 ms** · CLS ≤ **0.1**. Pass/fail gates in Lighthouse CI on every PR to `master`.
- **PERF-6** — Time to first meaningful paint of the **slot picker** ≤ **1.5 s** from tap. This screen is the product; it gets its own budget.
- **PERF-7** — No single JS long task over **200 ms** on the booking flow. Profile on a real budget Android device, not a MacBook.
- **PERF-8** 🔜 — Cold start to interactive home screen: **≤ 3 s** on a mid-tier device.

### Rules that keep the budgets honest
- **PERF-9** — Every route is **lazy-loaded** via `React.lazy`. Only the shell, auth, and home route sit in the initial chunk. *(Currently satisfied — `App.jsx` lazy-loads its route tree.)*
- **PERF-10** — MUI components MUST be imported by direct path, never as a barrel destructure from the package root. Enforced by ESLint `no-restricted-imports`.
- **PERF-11** — **Never import the whole icon set.** Import icons individually. An ESLint rule MUST block the barrel import.
- **PERF-12** — Heavy widgets (date pickers, data grids, charts, rich text, PDF viewers, maps, QR scanners) MUST be `React.lazy` + `Suspense`, never in the initial bundle. *(`DataGrid` and `charts` are already separate chunks — keep it that way.)*
- **PERF-13** — Images: modern format (WebP/AVIF) with fallback, explicit `width`/`height`, `loading="lazy"` below the fold, responsive `srcset`. **No image over 150 KB ships.** Doctor photos served at display size, not full resolution.
- **PERF-14** — Maximum **2 self-hosted font files** (one text family, ≤2 weights). `font-display: swap`. Latin subset first; Indic subsets loaded only when that language is active. No font CDN on the critical path.
- **PERF-15** — No animation on any property other than `transform` and `opacity`. No `box-shadow`, `width`, `height`, `top`, `left` transitions. Everything respects `prefers-reduced-motion`.
- **PERF-16** — Lists longer than **50 rows** MUST be virtualised. Applies to slot lists, appointment history, patient lists, and every admin table.
- **PERF-17** — No third-party script (analytics, chat, session recorder, ad pixel, A/B tool) loads before the app is interactive. All deferred; each requires approval — they are the fastest way to destroy every budget above.
- **PERF-18** — A performance regression is a **P1 bug**, treated like a broken feature. Not a "tech debt" ticket.

---

## 4. DESIGN SYSTEM & MUI RULES

- **UI-1** — **One theme file is the single source of truth** (`src/theme/index.js`, exporting `createAppTheme(mode)`). All colours, spacing, radii, shadows, typography and breakpoints live in the MUI theme. Anything not in the theme does not exist. **Do not create a second theme file "for one page" or "for a new palette idea."** This codebase shipped three competing theme definitions at once before this rule was written down — one wired into the app, one entirely dead, one built correctly (light/dark palettes, a real `useThemeMode()` hook) but never connected to `main.jsx` — and nobody noticed until a user reported the dark-mode toggle doing nothing. If a page needs a different look, add a variant inside the one theme file; never `createTheme()` a second time anywhere else in the codebase — grep for `createTheme(` before adding one; if it already appears outside `src/theme/index.js`, that's the bug.
- **UI-2** — **NEVER hardcode a colour.** No hex codes, no `rgb()`, no named colours in any file under `src/pages/`, `src/components/`, `src/layouts/`. Theme tokens only. Enforced by the `no-hardcoded-colors` ESLint rule. *(Standing debt: see §22.)*
  **Converting a hardcoded hex to a theme token is not a 1:1 nearest-colour mapping — pick the token that matches the app's actual brand, not whichever semantic bucket the old literal happens to fall into.** A hex like `#1A73E8` (Google Material blue) converts trivially to `theme.palette.info.main`, which is also blue — but if that colour was never actually a deliberate "informational" accent, just a leftover from before this app had a real theme, the "faithful" conversion silently preserves an off-brand colour with a theme-token alibi. This shipped live on `finances/index.jsx`'s "Export Report" button and its "Cash Drawer" tab indicator — both a Google-blue accent nothing else in the app uses, converted to `info.main` because that was the nearest-matching token, not because blue was ever the right choice. A user immediately asked "why is this blue" the moment it rendered next to the app's teal-branded sidebar. **When sweeping a file for UI-2, ask whether the original colour was brand-consistent before preserving it — if a page's own accent colour doesn't match `primary.main` anywhere else in the app, converting it to a technically-correct-but-still-wrong token (`info`/`secondary`/whatever it's nearest to) is not done; flag it and default to `primary` unless there's a real, stated semantic reason (a genuine status colour, a deliberate one-off) for something else.**
- **UI-3** — **NEVER hardcode spacing in pixels.** Use the theme spacing scale (`theme.spacing(n)` / `sx={{ p: 2 }}`) on an 8px base. Only permitted raw pixels: hairline borders (1px) and explicitly-specified icon sizes.
- **UI-4** — Typography: a **fixed, closed set** of variants in the theme. No `fontSize` overrides in components. Need a new size? Add a named variant with a stated purpose.
- **UI-5** — Styling order of preference: (1) theme `components` overrides for anything global, (2) `sx` for one-off layout, (3) `styled()` for a reusable variant. **Never** inline `style={{}}`, never a global CSS file, never `!important`. Zero exceptions on `!important`.
- **UI-6** — If a UI pattern appears **three times**, extract it into `src/components/`. Copy-paste twice is fine; three times is a bug.
- **UI-7** — Wrap MUI primitives in thin local components (`<AppButton>`, `<AppTextField>`) for anything used more than a few times. Product code imports the wrapper, so MUI can be restyled or replaced without touching hundreds of files.
- **UI-8** — **Dark mode is shipped, real, and app-wide as of 2026-08-29** (`context/ThemeContext.jsx`'s `ThemeModeProvider`/`useThemeMode()`, wired at the app root in `main.jsx`, synced to the backend via `myProfile`/`updateMyProfile`'s `theme_mode` field so the preference follows the user across devices — `localStorage` remains the instant-apply/offline copy, never the only copy) — this rule now means *stay* correct, not just *stay possible*. Every light/dark toggle in the app MUST read and write the shared `useThemeMode()` context — **never local component state** (`useState(false)` for a "dark mode" flag is the exact bug that shipped: a header button that visibly toggled but changed nothing, sitting next to a Settings page with its own second, equally disconnected toggle).

  **A component is not dark-mode-complete until every one of the following resolves from the active palette — fixing only background+text and leaving a light-mode-tuned shadow or gradient is still an incomplete fix:**
  - **Background** — `bgcolor: 'background.default'` (page canvas) or `'background.paper'` (cards/surfaces). Never a literal `#FFFFFF`/`#fff`.
  - **Border** — `borderColor: 'divider'`, or a semantic palette border (`'primary.main'` etc.) where the design calls for one. Never a literal `#E8EAED`-class hex.
  - **Text** — both `'text.primary'` (headings, values) and `'text.secondary'` (labels, captions) — a literal `#202124`/`#5F6368` is this codebase's own token values by convention, always safe to convert.
  - **Shadow** — the theme's own `shadows[]` indices (`theme.shadows[2]`, or the `boxShadow` values already defined in `theme/index.js`'s `components` overrides). A hand-rolled `rgba(32,33,36,...)` shadow was tuned for a white background and looks wrong (or invisible) on a dark one.
  - **Gradient** — built from `theme.palette.primary.main`/`.light`/`.dark`, never a literal two-hex gradient string frozen to one mode.
  - **Inputs** — `MuiTextField`/`MuiOutlinedInput` border/hover/focus colours come from the theme's own component overrides, not a per-page re-declaration.
  - **Sidebar / nav selected-state** — reuse the theme's `MuiListItemButton` override; don't re-derive a selected-row colour per page.
  - **Icon colours inside icon pills/badges** — derive from the same token/prop the surrounding card uses (`alpha(color, 0.1)` off a real palette colour is fine; a literal hex icon tint is not).
  - **Appointment/booking status colour** — always `theme.palette.appointmentStatus[status]` (`{bg, text, border, dot}`, `theme/index.js`), never a per-file `STATUS_CFG`/`STATUS_COLORS` hex map. This exact anti-pattern was independently re-invented in at least six files (`RecentAppointmentsTable`, `StitchStatusChip`, `CalendarView`, `AppShell`, `calendar/index.jsx`, `clinician/Calendar.jsx`, `appointments/index.jsx`) before being consolidated — grep for a local status/colour map before writing a new one. A status this table doesn't cover (e.g. a calendar's own `'break'`/`'scheduled'` block) gets a small local helper built the same way (`alpha(theme.palette.warning.main, ...)`), not a hand-picked hex.
  - **A test rendering any component that reads `theme.palette.appointmentStatus` (or any other custom palette extension) MUST wrap it in the real app theme** (`createAppTheme('light')` from `theme/index.js` via `<ThemeProvider>`), not render with no `ThemeProvider` at all. A bare `useTheme()` with no provider silently returns MUI's stock default theme, which has no `appointmentStatus` key — `theme.palette.appointmentStatus[status]` then throws `Cannot read properties of undefined`, crashing the whole component to a blank `<div/>` with no useful error surfaced by React Testing Library. Found live fixing `appointments/index.test.jsx` during the Phase 3 colour sweep (2026-08-29) — the real app is never rendered without a `ThemeProvider` (`main.jsx` wraps the whole tree), so a test that omits one was already testing an unrealistic setup, not a stricter one.
  - **A hover-triggered `Popover`/preview card's own content MUST be reachable by a real mouse**, not just visible. The common recipe — `pointerEvents: 'none'` on the `Popover` root so it doesn't block the page underneath — also makes everything inside it, including a "click to view full details" link, permanently unclickable, and makes moving the cursor from the trigger toward the popover register as leaving the trigger (hiding it before the cursor arrives). Fixed pattern: keep `pointerEvents: 'none'` on the Popover root, but set `pointerEvents: 'auto'` on `slotProps.paper` and give the paper its own `onMouseEnter`/`onMouseLeave` that share the same hide-timer the trigger uses, so hovering from the card into the popover is one continuous hover. Found live in `clinician/Calendar.jsx`'s `ApptPopover` (2026-08-29) — a pre-existing bug, not something the colour sweep introduced, but only found because a live user tried to actually use it.
  - **"Missing spacing" reported against a dark-mode screen is not always a margin/padding bug — check computed background contrast before touching spacing values.** A user flagged `finances/index.jsx`'s info banner as having no visible gap above/below it; the actual DOM margins measured 16–24px, a correct 8px-multiple already. The real bug: MUI's own default dark-mode background calculation for `<Alert severity="info">`'s `standard` variant produced `rgb(14,19,25)`, **darker** than the `Card`/`Paper` surface it sat on (`rgb(22,35,45)`) — instead of reading as a highlighted callout, it read as a hole, and correct whitespace around a component with inverted contrast looks like no whitespace at all, because there's no boundary left for the eye to register. Fixed with an explicit `theme.components.MuiAlert` override (`standardSuccess`/`standardInfo`/`standardWarning`/`standardError`, each `alpha(palette[x].main, 0.12–0.16)` background + a matching border + icon colour) rather than trusting MUI's automatic per-severity dark-mode tint — the same class of gap as the `MuiDataGrid`/FullCalendar/Recharts findings above: a stock component default that was never actually verified against this app's specific dark palette. Before "fixing" a reported spacing gap, get the computed `background-color` of the flagged element and its container and compare lightness — if the "gap" element is darker than what surrounds it, the bug is contrast, not spacing.

  Every new component MUST use semantic palette tokens so it renders correctly in both modes automatically — a literal `bgcolor: '#FFFFFF'`/`color: '#202124'` is invisible in light mode (matches the light palette by coincidence) and renders as a broken white card or unreadable text the moment a user switches to dark. This was found live on the dashboard's own greeting banner and its shared `KpiCard` component. **The phased sweep (Phase 1 shared components/chrome, Phase 2 patient/public mobile-first, Phase 3 clinician tablet-first, Phase 4 staff/admin/manager desktop-dense) is now complete as of 2026-08-29** — see the UI-2 entry in §22 for the final count (126 warnings, every one a confirmed deliberate exception) and the exception categories to recognise before "fixing" one of them.
- **UI-9** — Icons come from exactly **one** set (`@mui/icons-material`). Mixing sets is a review failure.
- **UI-10** — Every interactive element MUST have all of: default, hover, **focus-visible**, active, disabled, loading. A button with no loading state is an incomplete button.
- **UI-11** — **Never disable a submit button without telling the user why.** Either keep it enabled and validate on tap, or show inline text explaining what's missing. A dead grey button is a dead end.
- **UI-12** — Elevation/shadow: max 3 levels, defined in the theme. No custom shadows.
- **UI-13** — Corner radius: max 3 values in the theme. Pick them once.
- **UI-14** — No component may exceed **250 lines**; no file may exceed **400 lines**. *(Standing debt: see §22.)*

---

## 5. RESPONSIVE & LAYOUT RULES

- **RES-1** — **Mobile-first, always.** Base styles for the smallest screen, then breakpoints upward. Never desktop-first with `max-width` patches.
- **RES-2** — The patient surface MUST be fully functional and visually correct at **320px**. Hard floor, not a courtesy.
- **RES-3** — **No horizontal scrolling on the page body. Ever.** Wide content (tables, charts, date strips) scrolls inside its own `overflow-x: auto` container with a visible affordance. Every `<Table>` needs a `<TableContainer>`. **Note:** `document.scrollWidth > clientWidth` does **not** catch this — it reported clean on two live-confirmed truncation defects. Use the element-level probe in `technical-plans/06-frontend-architecture-and-mobile.md` §7.
- **RES-4** — Theme breakpoints only. **No magic pixel numbers in media queries** anywhere.
- **RES-5** — Minimum touch target **48 × 48 CSS px**, with ≥ **8px** between adjacent targets. Includes icon buttons, close buttons, checkboxes, radios, chips, and calendar date cells. Calendar cells are the rule people always break — do not.
- **RES-6** — Body text ≥ **16px** on patient-facing surfaces; never below **14px** anywhere for any label, caption, helper or legal text. Sub-16px inputs also trigger iOS auto-zoom.
- **RES-7** — Flex/grid with relative units. **Fixed heights are banned** except known-fixed chrome (app bar, bottom nav). Hindi and Tamil run ~40% longer than English — a layout that only fits English is broken.
- **RES-8** — Nothing conveyed by hover alone. Hover does not exist on touch. Every hover affordance has a tap-accessible equivalent.
- **RES-9** — Primary actions on mobile live in the **bottom third** (thumb zone). Destructive actions never adjacent to primary actions.
- **RES-10** — Test matrix every release: **320 · 360 · 393 · 412 · 768 · 1024 · 1440**, portrait and landscape. Automated screenshot test.
- **RES-11** — MUST survive OS font scaling to **200%** without clipping or overlap. Use `rem`; never fix container heights around text.
- **RES-12** — Long unpredictable strings (doctor names, clinic names, addresses, test names) MUST have defined truncation or wrapping. Assume 60-character clinic names exist, because they do.

### Surface tiering (how RES rules apply per surface)

Not every screen owes the patient app's bar. Declare the tier and verify at those widths:

| Tier | Surfaces | Designed for | Verify at | At other widths |
|---|---|---|---|---|
| **Mobile-first** | patient app, public booking, QR check-in, patient portal | 360px | 360 / 414 / 768 | Full function everywhere |
| **Tablet-first** | clinician consult, Rx builder, clinician calendar | 1024px | 768 / 1024 / 1280 | On a phone: readable and scrollable, not necessarily efficient |
| **Desktop-dense** | front desk, billing, admin, reports, pharmacy POS | density | 1280 / 1440 | At 360px scrolling is fine; **truncated data is not** |

---

## 6. MOBILE SHELL / WEBVIEW RULES 🔜

**Status: conditional.** There is no Capacitor shell in the codebase today — no `capacitor.config.*`, no `src/platform/`. These rules are the contract for the day that work starts. Do not claim compliance; do not delete them. Every one is derived from a real failure mode.

- **WV-1** 🔜 — Safe areas: the shell MUST use `env(safe-area-inset-*)` for top and bottom padding. Nothing under a notch, status bar, home indicator, or gesture bar. Test on a notched and a gesture-nav device.
- **WV-2** 🔜 — The **Android hardware back button MUST be handled explicitly** on every screen: close the topmost layer (modal → sheet → drawer → keyboard → history). On home, prompt to exit; never silently kill. An unhandled back button that exits mid-booking is a launch blocker.
- **WV-3** 🔜 — Real router with real history. **Never** rely on browser chrome — there is none in the shell. Every screen has an in-app back affordance.
- **WV-4** 🔜 — Keyboard: the focused input MUST remain visible when the keyboard opens. Set resize mode explicitly; test the longest form (patient registration) on a small device. Sticky bottom bars MUST NOT cover the focused field.
- **WV-5** — **Never use `alert()`, `confirm()`, or `prompt()`.** They block the WebView and render with your domain in them. Use MUI Dialog. *(Applies today — enforce now.)*
- **WV-6** — **Never rely on `window.open`, new tabs, or `target="_blank"`** for core flows. Nothing may open a screen the user cannot return from. External links open in an in-app browser with a visible close button. *(Applies today.)*
- **WV-7** 🔜 — Assume `localStorage` **can be cleared by the OS**. Never the only copy of anything important. Auth tokens go to secure native storage via the platform wrapper; drafts recoverable from the server. **See SEC-2 — this is already a live violation on web.**
- **WV-8** 🔜 — The UPI app-switch MUST be treated as an **interruption, not a navigation**. Persist booking state before switching. On resume, reconcile payment status with the server, never trust in-memory state, never lose the slot selection. Handle: returned paid · returned unpaid · returned after 20 minutes · app killed.
- **WV-9** 🔜 — Explicit **app-resume handler**: revalidate auth, refetch time-sensitive data (slot availability, queue position), check for in-flight payment.
- **WV-10** 🔜 — Deep links MUST work for a specific doctor, clinic, booking, and the payment return URL — and every one MUST also work as a plain web URL.
- **WV-11** 🔜 — **Pull-to-refresh and overscroll bounce MUST be disabled** unless explicitly designed. Accidental refresh mid-form is a common complaint.
- **WV-12** 🔜 — Text selection and long-press menus disabled on non-text UI (buttons, cards, nav); enabled on content users copy (booking ID, address, phone, prescription text).
- **WV-13** — No `:hover` styles applied on touch. Gate behind `@media (hover: hover)`. *(Applies today.)*
- **WV-14** 🔜 — Every native permission (camera, notifications, location, storage) requested **in context, with a pre-prompt explaining why** — never on launch. A denied-permanently state MUST have a path to system settings.
- **WV-15** 🔜 — **Forced-update mechanism** driven by a server-side minimum-version check, with a blocking screen. You will need this.
- **WV-16** — MUST detect and display offline state via a persistent, non-blocking banner, auto-recovering on reconnect. See **DATA-8**. *(Applies today.)*
- **WV-17** — No feature may be **web-only silently**. If something needs a capability the current build lacks, show a clear message, not a broken button. *(Applies today.)*
- **WV-18** 🔜 — Test on a real low-end Android device on real mobile data before every release. Emulator-only is not testing.

---

## 7. NAVIGATION & USER JOURNEY RULES

- **NAV-1** — **Maximum 3 taps from app open to the slot picker** for a returning user. Count them. If it's four, redesign.
- **NAV-2** — Navigation depth MUST NOT exceed **4 levels**. Deeper means the IA is wrong.
- **NAV-3** — **The user must never be trapped.** Every screen, modal, sheet and error state has a visible way out that does not require a hardware back button.
- **NAV-4** — **Login is NOT required to browse.** Users MUST be able to search doctors, view profiles, see fees and see available slots while logged out. Auth is requested at the last possible moment — at confirmation, not entry. **This single rule will move conversion more than any other in this document.**
- **NAV-5** — When auth is required mid-flow, the user MUST return to **exactly where they were**, with all state intact including the chosen slot. Losing a slot to a login screen is a launch blocker.
- **NAV-6** — Any flow longer than 2 steps MUST show a **step indicator** ("Step 2 of 3") and MUST allow going back without data loss.
- **NAV-7** — **Never block the user on a decision they can't yet make.** No insurance details before they know the fee; no full profile before they've picked a doctor.
- **NAV-8** — Deep links MUST restore full context. A shared doctor link opens that doctor, not the home page.
- **NAV-9** — Bottom navigation (patient) has **3–5 items**, with text labels, never icons alone. Icon-only nav fails badly for non-English-first users.
- **NAV-10** — Destructive actions MUST require confirmation stating the consequence in specifics ("Your ₹500 will be refunded in 5–7 days"), never a generic "Are you sure?".
- **NAV-11** — Search reachable within one tap from home, supporting partial and misspelled input. Indian names have many spellings; exact-match-only search is broken search.
- **NAV-12** — Every screen MUST be reachable by URL. No state that exists only after a particular click path. **Watch for route collisions**: a pathless layout `<Route element={...}>` directly under `<Routes>` can silently claim `/` — this shipped once and made the public landing page unreachable for everyone. Verify what a new route actually resolves to.

---

## 8. BOOKING FLOW RULES — THE CORE OF THE PRODUCT

Treat this section as the product specification, not styling guidance.

- **BOOK-1** — **Slot availability MUST be treated as stale the moment it renders.** Refetch on screen focus, on app resume, and every 30 s while the picker is open. Show the last-updated moment.
- **BOOK-2** — **A slot MUST be held server-side the moment the user selects it**, with a visible countdown ("Slot held for 9:45"). No hold = double bookings = angry patients and clinics. On expiry, say so clearly and return to the picker with other choices intact.
- **BOOK-3** — Every booking mutation MUST send a **client-generated idempotency key**. Retries, double-taps and flaky-network resubmissions MUST NOT create two appointments. Non-negotiable in a payment + booking product.
- **BOOK-4** — **Every submit button in the booking flow MUST disable itself and show a loading state on first tap.** Double-tap on a slow network is the single most common cause of duplicate bookings in India.
- **BOOK-5** — **The fee MUST be visible before slot selection**, and the exact total (fee + platform charges + taxes) before payment. **No surprise charges at the last step, ever.**
- **BOOK-6** — Unavailable slots MUST be shown as visibly unavailable, not hidden. Users need to see 4 PM is taken to trust 5 PM is real.
- **BOOK-7** — Slots MUST be grouped by **period** (Morning / Afternoon / Evening) with counts. A flat list of 40 times is unusable at 360px.
- **BOOK-8** — **12-hour format with AM/PM** for patients. Dashboards may use 24-hour. Never mix within one surface.
- **BOOK-9** — **All times display in IST. All times over the wire are UTC ISO-8601.** No locale-dependent parsing, no string date math, one date library (dayjs). **Known trap:** a fixed local-clock-hour `Date#setHours()` fixture is timezone-ambiguous on an IST host — an early-morning local hour can land on the previous UTC day. Anchor "today" to `Date.now()` minus a few hours, never a fixed clock hour.
- **BOOK-10** — Dates render as `Wed, 26 Aug` — never `26/08/2026` or `08/26/2026`. DD/MM vs MM/DD ambiguity causes real missed appointments.
- **BOOK-11** — Relative labels ("Today", "Tomorrow") for the next two days, **with the absolute date alongside**. Never relative alone.
- **BOOK-12** — **Expected wait time / queue position MUST be surfaced** on confirmation and on the day, updating live if the clinic runs late. Indian clinics run late; an app that pretends otherwise loses trust on day one. **If you ship only one differentiator, ship this one.**
- **BOOK-13** — Confirmation MUST show on one screen without scrolling: doctor name, specialisation, clinic name, **full address with directions link**, date, time, patient name, fee, amount paid, payment status, booking ID — plus how to reach the clinic and how to cancel.
- **BOOK-14** — The **cancellation and refund policy MUST be visible before payment**, in plain language, with actual numbers. Not a link to terms. Not a checkbox. Visible text.
- **BOOK-15** — Cancel and reschedule MUST be **self-serve in-app**, ≤ 2 taps from the booking. Never "call the clinic to cancel".
- **BOOK-16** — Multi-patient support at launch. "Booking for: Self / Mother / Add someone" MUST appear in the flow, and profiles persist. One phone books for the whole family in India.
- **BOOK-17** — Confirmation MUST offer **add to calendar**, share on WhatsApp, and get directions. WhatsApp sharing is how confirmations actually travel in India — a primary channel, not an afterthought.
- **BOOK-18** — Booking state MUST be **resumable**. If the app is killed mid-flow, reopening returns the user with a clear "Continue your booking?" prompt.
- **BOOK-19** — **NEVER show a booking as confirmed until the server confirms it.** Optimistic UI is fine for likes and filters, never for a booking or a payment.
- **BOOK-20** — If payment succeeds but booking confirmation fails, the UI MUST show a specific, honest recovery state with support contact and transaction reference — never a generic error. **This state MUST be built and tested**, not left to chance.
- **BOOK-21** — For diagnostics: prep instructions (fasting, timing, what to bring) MUST appear **before** payment, not only in the confirmation email.
- **BOOK-22** — Doctor profiles MUST show qualifications, registration number, years of experience, languages spoken, and consultation fee. ⚖️ Registration number is both a trust device and likely a regulatory expectation.
- **BOOK-23** — "Languages spoken" is a **primary filter**, not a detail. It matters more than star ratings in this market.

---

## 9. FORMS & INPUT RULES

Forms use **react-hook-form + zod** (`zodResolver`). That pairing is the canonical choice per BASE-4.

- **FORM-1** — **Ask for the minimum.** Every field justifies its existence to the tech lead. Optional fields are a smell.
- **FORM-2** — Every input MUST have a **persistent visible label**. Placeholder-as-label is banned — it disappears exactly when needed and fails accessibility.
- **FORM-3** — Every input MUST set correct `type`, `inputMode`, `autocomplete` and `enterkeyhint`. A numeric field opening a QWERTY keyboard is a bug.
- **FORM-4** — Phone: **10 digits, +91 fixed and non-editable**. Auto-strip spaces, dashes, leading `+91`/`0` from pasted input. Never reject a paste for formatting.
- **FORM-5** — **OTP input MUST support autofill/auto-read**, auto-submit on the last digit, paste of the whole code, and a resend timer. Manual OTP entry is a conversion killer.
- **FORM-6** — OTP screens MUST show the number the code went to, plus an "edit number" link. Users mistype constantly.
- **FORM-7** — Validation **on blur and on submit, never on every keystroke**. "Invalid email" after one character is hostile. **Known trap:** react-hook-form's default `mode: 'onSubmit'` means `formState.errors` never populates if nothing calls `handleSubmit` — wiring `error`/`helperText` props without a submit path produces dead validation UI. This shipped once. If a step has no submit button, set `mode: 'onChange'` or `'onBlur'` explicitly.
- **FORM-8** — Error messages MUST say **what to do**, not what went wrong. "Enter a 10-digit mobile number" ✅ / "Invalid input" ❌. No technical term, bare error code, or stack trace.
- **FORM-9** — On failed submit, focus moves to the first invalid field and the error is announced to screen readers.
- **FORM-10** — Multi-step forms MUST **autosave a local draft** every step. Losing a half-filled registration to a phone call is unacceptable.
- **FORM-11** — Address: **pincode-first with auto-fill** of city and state. Never make the user pick from long dropdowns. Canonical India shape: `{line1, line2, city, state, pincode, country}`.
- **FORM-12** — Name fields MUST accept a **single field of ≥ 60 characters** with spaces, dots and apostrophes. **No forced first/last split** — Indian names do not reliably split. No minimum length above 2.
- **FORM-13** — Age/DOB: offer **both** "enter age" and "pick date of birth". Many patients know their age, not their exact DOB.
- **FORM-14** — Dropdowns with > 8 options MUST be searchable; < 5 options SHOULD be radios or chips.
- **FORM-15** — **Never clear a form on error.** Never clear a field on validation failure. Never lose typed data for any reason.
- **FORM-16** — File upload (prescriptions, reports, insurance) MUST accept camera capture, show a preview, show progress, allow removal, state accepted formats and size limit **before** upload, and compress client-side.
- **FORM-17** — Every form works end-to-end with keyboard alone, in logical tab order.
- **FORM-18** — Currency is always **₹ with Indian digit grouping** (₹1,50,000 — not ₹150,000) via a shared formatter. Money is **paise (integer)** over the wire, converted to rupees only at the display boundary. Never format currency by hand in a component.
- **FORM-19** — **Every zod-validated form MUST have a test asserting at least one validation failure path.** Without compile-time types (BASE-3), an untested schema is the easiest place for a silent contract break. A form whose schema is never exercised by a test is incomplete.
- **FORM-20** — **A plain `<textarea>`/MUI `TextField multiline` MUST NOT be used for content that is later displayed as formatted text to the same or another user** — clinical/encounter notes, prescription instructions, messages, bios, policy/template bodies, review text. Use a rich text editor instead (canonical: **TipTap**, per BASE-4 — do not add a second editor library). A plain multiline field remains correct for genuinely unformatted data that merely wraps onto multiple lines — addresses, short comments with no reader-facing formatting, search boxes. Load the editor via `React.lazy`/`Suspense` (PERF-12) — it is a heavy widget, never part of the initial bundle. *(Standing gap as of 2026-08-29 — no rich text editor exists in this codebase yet and all 58 current `multiline` fields are plain; see §22. New reader-facing free-text fields comply from today; retrofitting existing fields is its own future slice, not blocked on this rule.)*

---

## 10. PAYMENT UI RULES

- **PAY-1** — **UPI MUST be the first and most prominent option.** Card-first checkout is wrong for this market.
- **PAY-2** — **"Pay at clinic" MUST be a visible, equal-weight option** wherever the clinic permits it. Forcing prepayment costs a large share of bookings.
- **PAY-3** — The **exact total MUST be shown before the payment method is chosen**, itemised: consultation fee, platform fee, taxes, discount. No line item appears after this point.
- **PAY-4** — The payment screen MUST NOT be interruptible by an accidental back gesture without confirmation.
- **PAY-5** — Payment status MUST be **derived from the server, never the client**. On return from a payment app, poll the server. Never conclude "paid" because a redirect said so.
- **PAY-6** — A **"payment pending / verifying"** state MUST exist as a designed screen with a spinner, an explanation, and a timeout path to support. This happens constantly with UPI; it is not an edge case.
- **PAY-7** — Payment failure MUST distinguish **failed** from **pending** from **cancelled by user**, and offer retry without re-entering anything or losing the slot hold.
- **PAY-8** — Refund UI MUST state the **expected timeline in days** and show refund status in the booking detail. "Refund initiated" with no date is not information.
- **PAY-9** — **Never store or render full card numbers.** No card data touches your JS. Use the gateway's SDK/hosted fields.
- **PAY-10** — Every completed payment MUST produce a downloadable/shareable receipt with the transaction reference, accessible later from booking history.
- **PAY-11** 🔜 — Test the full payment flow **inside the mobile shell**, not just the browser. Gateway SDKs behave differently there. Mandatory pre-release check once the shell exists.

---

## 11. STATE, DATA & OFFLINE RULES

Server state is **Apollo Client**. That is the query library referenced throughout.

- **DATA-1** — **Server state and client state are separate concerns.** Server data lives in Apollo's cache. UI state lives in local component state or a small store. **Never put server data in a global client store.** This one rule prevents most state bugs in React apps.
- **DATA-2** — **No `useEffect` for data fetching.** Use `useQuery`/`useLazyQuery`/`useMutation`. A `useEffect` containing a `fetch`/`axios` call fails review.
- **DATA-3** — Prop drilling deeper than **2 levels** MUST be replaced by composition or context.
- **DATA-4** — Every network call MUST go through **one client** with centralised auth, error mapping, timeouts and retries (`src/apollo/client.js`). No component calls `fetch` directly. **Exception, documented:** authenticated binary downloads (PDFs) cannot go through Apollo — they use the single shared helper in `src/utils/documents.js`, never an ad-hoc `fetch`. A bare `<a href>` cannot carry a Bearer header.
- **DATA-5** — Every request MUST have a **timeout** (10 s default). A hanging spinner is worse than an error.
- **DATA-6** — Retries: automatic for idempotent reads with exponential backoff. **Never auto-retry a booking or a payment** — those retry only on explicit user action, always with the same idempotency key.
- **DATA-7** — Every list query MUST be paginated from day one, returning `{data, paginatorInfo}`. No "load all appointments". **An unbounded list query is a defect, not a simplification.**
- **DATA-8** — Offline behaviour MUST be **designed, not accidental**: persistent offline banner; cached read-only access to upcoming bookings and their details (address, time, booking ID — what a patient needs standing outside a clinic with no signal); writes queued or clearly blocked with an explanation; automatic recovery on reconnect.
- **DATA-9** — Cache invalidation MUST be explicit after every mutation (`refetchQueries` or a cache update). **A cancelled booking that still shows as active is a trust-destroying bug.** A mutation that changes a list MUST refetch or update that list — a missing `refetchQueries` is the single most common wiring defect in this codebase's history.
- **DATA-10** — Sensitive data (health records, reports, prescriptions) MUST NOT be cached to disk beyond an explicit documented policy, and MUST be cleared completely on logout. ⚖️
- **DATA-11** — Logout MUST clear all caches, all stores and all persisted state. Test by logging in as a second user and confirming nothing leaks.
- **DATA-12** — Polling capped: nothing faster than every **10 s**, and all polling stops when the tab is hidden or the app is backgrounded.
- **DATA-13** — **Never fall back to mock or fabricated data on an empty result.** Fallback is permitted only on a genuine query `error`, and only where documented. `rows.length > 0 ? apiRows : mockRows` is a defect — it renders fake patients whenever a real filter legitimately matches nothing. This shipped live on two pages. Once a domain has a real backend, the page calls it for real.

---

## 12. LOADING, EMPTY & ERROR STATES

- **STATE-1** — Every async surface MUST implement **all five states**: loading, empty, error, partial/stale, success. A PR adding a data-driven screen with only a success state is incomplete and MUST be rejected.
- **STATE-2** — **Skeleton screens that match the real layout**, not centred spinners, for content areas. Spinners are only for button-level actions.
- **STATE-3** — **NEVER show a layout shift when content loads.** Reserve the space. This is a CLS failure and it looks cheap.
- **STATE-4** — Empty states MUST include an explanation and a next action. "No appointments" is a dead end; "No upcoming appointments — Book a consultation" is a screen.
- **STATE-5** — Error states MUST offer a **retry** that actually retries, without a full page reload and without losing context.
- **STATE-6** — **No raw error, error code, stack trace or backend message may reach the user.** All errors map to a human sentence via a central error map. Technical detail goes to logging.
- **STATE-7** — Distinguish **offline** from **server error** from **not found** from **not permitted**. Four messages, four recovery paths.
- **STATE-8** — Error boundaries MUST wrap every route so one broken component cannot white-screen the app. The fallback offers a way home. **Known trap:** a missing import crashes the whole page with a blank screen and no visible error text — catch it with a `page.on('pageerror')` assertion in e2e, not by eye.
- **STATE-9** — Actions over **400 ms** MUST show feedback within 400 ms. Actions over 3 s MUST show progress or a reassurance message.
- **STATE-10** — Success feedback is mandatory for every mutation. Silent success is a bug — the user will tap again.
- **STATE-11** — Toasts MUST NOT be the only place a critical message appears. Payment results, booking confirmations and errors needing action get a persistent surface, never a 3-second toast.

---

## 13. ACCESSIBILITY RULES

⚖️ Accessibility has real legal weight in India for service providers, and the elderly are a core user group for a healthcare product. Not optional polish.

- **A11Y-1** — Target **WCAG 2.2 Level AA**. `eslint-plugin-jsx-a11y` runs with **errors**, not warnings, in CI. `axe-core` runs in automated tests; **zero critical or serious violations** may merge.
- **A11Y-2** — Text contrast ≥ **4.5:1** (≥ 3:1 for large text and UI component boundaries). Verify every theme token pair; do not eyeball. Light grey placeholder on white fails and is banned.
- **A11Y-3** — **Colour MUST NEVER be the only carrier of meaning.** Available vs booked slots need an icon, label or pattern too. Roughly 1 in 12 Indian men is colour-blind.
- **A11Y-4** — Every interactive element MUST have a **visible focus indicator**. Removing focus outlines without replacing them is an automatic rejection.
- **A11Y-5** — Every image has meaningful `alt` (or `alt=""` if decorative). **Every icon-only button has an `aria-label`.** A `Tooltip` is *not* an accessible name — three real gaps shipped with a tooltip and no label.
- **A11Y-6** — Semantic HTML first: real `<button>`, real `<a>`, headings in order, real landmarks. A clickable `<div>` fails review. ARIA is a last resort, not a first tool.
- **A11Y-7** — Modals MUST **trap focus**, close on Escape, and return focus to the trigger on close.
- **A11Y-8** — Dynamic updates (slot became unavailable, payment succeeded, validation failed) MUST be announced via live regions.
- **A11Y-9** — The **entire booking flow MUST be completable with a screen reader** and keyboard only. Test once per release with TalkBack on Android. Put it in the release checklist.
- **A11Y-10** — Respect `prefers-reduced-motion`. No auto-playing carousels, no unavoidable animation.
- **A11Y-11** — An accessible "large text / high contrast" affordance SHOULD be available in settings. Users include 70-year-olds booking cardiology appointments.
- **A11Y-12** — **A MUI `Select` needs a `data-testid` if it must be targeted after it can hold a value.** Its accessible name concatenates label + selected value once one is set, so `getByLabel(exact)` silently stops matching. And a `Select` with no visible `InputLabel` is labelled via `inputProps={{ 'aria-label': ... }}` — a bare `aria-label` prop lands on the wrong DOM node.

---

## 14. LOCALISATION RULES

**Status: no i18n layer exists today.** These rules govern the work that introduces one. I18N-1 is the most expensive rule in this document to retrofit — see §20.1.

- **I18N-1** — **NO hardcoded user-facing string anywhere.** Every string goes through the i18n layer from the first commit of that layer onward. Enforced by an ESLint rule flagging string literals in JSX. Retrofitting costs 10×.
- **I18N-2** — Ship English + Hindi first. Architect for ≥ 6 languages. Prioritise the rest by where clinics actually are.
- **I18N-3** — Language choice MUST be available **before login**, persist across sessions and devices, and be reachable in ≤ 2 taps — not buried in settings.
- **I18N-4** — Every layout MUST tolerate **+40% string length** without breaking. Test with a pseudo-locale in CI. Fixed-width buttons with centred English text will break.
- **I18N-5** — **Never concatenate translated strings.** No `t('you have') + count + t('appointments')`. Use interpolation and proper plural rules — Indian languages have plural rules English does not.
- **I18N-6** — Dates, times, numbers and currency formatted through locale-aware shared utilities. Never hand-formatted. Indian digit grouping applies (FORM-18).
- **I18N-7** — Indic fonts MUST render correctly including conjuncts and matras. Verify Devanagari, Tamil and Bengali specifically — they break most often. Test on a real Android device, not Chrome desktop.
- **I18N-8** — Translation files load **per-language, lazily**. Never bundle all languages.
- **I18N-9** — Names, addresses and free text MUST accept and render Unicode correctly. No ASCII-only validation on any name or address field.
- **I18N-10** — A missing translation falls back to English **visibly in dev** (so it gets caught) and silently in prod. CI reports coverage per language.

---

## 15. SECURITY, PRIVACY & COMPLIANCE

⚖️ **Everything here must be confirmed with legal counsel.** Health data is sensitive personal data in India and the regulatory picture (DPDP Act 2023 and its rules, ABDM, NMC telemedicine guidance) is actively evolving.

- **SEC-1** — HTTPS everywhere. No mixed content. Any mobile shell MUST NOT allow cleartext traffic.
- **SEC-2** — **Auth tokens MUST NOT live in `localStorage`.** Web: httpOnly, Secure, SameSite cookies. Native: secure storage via the platform wrapper. Short-lived access tokens with silent refresh. *(Standing violation — see §22.)*
- **SEC-3** — Any user-supplied HTML MUST be sanitised. `dangerouslySetInnerHTML` requires a sanitiser and code-owner review. Prefer never using it.
- **SEC-4** — A Content Security Policy MUST be set, as tight as the app allows.
- **SEC-5** — **Health data MUST NOT appear in URLs, query strings, analytics events, error logs or third-party tools.** Ever. Add an automated check scanning analytics payloads for PII/PHI keys.
- **SEC-6** — Session timeout with a warning, and mandatory re-auth before viewing or downloading medical records. Clinic and admin surfaces get shorter timeouts than the patient app.
- **SEC-7** 🔜 — Screenshots of prescription/report screens SHOULD be blocked in the native app where the platform permits.
- **SEC-8** — **Consent MUST be explicit, granular and unbundled.** ⚖️ No pre-ticked boxes. No consent bundled into "continue". Separate consent for service delivery, marketing, and any data sharing. Plain language, in every language the app supports.
- **SEC-9** — **Withdrawing consent MUST be as easy as giving it** ⚖️ — same number of taps, discoverable from the profile screen. Build the withdrawal UI in the same sprint as the consent UI.
- **SEC-10** — Users MUST have in-app UI to **view, correct, export and request deletion** of their data, plus a visible grievance channel with a named contact. ⚖️
- **SEC-11** — Privacy policy and terms reachable in ≤ 2 taps and readable **inside** the app, not only as a browser redirect.
- **SEC-12** — ⚖️ **Minors:** if under-18 patients are supported, the flow MUST route through a verified guardian account. Do not collect a child's data on a self-serve adult flow. Design with counsel before building.
- **SEC-13** — ⚖️ Doctor registration number and qualifications MUST be displayed. Patient reviews for named doctors carry advertising-regulation risk in India — get sign-off before shipping a review feature.
- **SEC-14** — ⚖️ Teleconsultation requires patient identity confirmation, doctor identity and registration display, explicit consent capture, and a compliant digital prescription format. Do not ship teleconsult without a compliance review.
- **SEC-15** — ABDM/ABHA integration is a **deliberate product decision with a certification process attached**. Do not half-build it. If you integrate, follow their UI and branding requirements exactly; if you don't, don't imply you have. ⚖️
- **SEC-16** — Analytics MUST be consent-gated and log **events, not content**. `booking_completed` with a specialisation ID ✅. With the patient's name and symptoms ❌.
- **SEC-17** — No session-recording tool may capture form inputs, medical content or payment screens. Mask by default, unmask by exception.
- **SEC-18** — **Frontend permission checks are UX, never security.** Every gate MUST also be enforced server-side. And a frontend route's role gate MUST match its backend resolver's `@Auth()` — a narrower frontend gate silently locks out legitimate users, which has shipped three times. Check both, not one.

---

## 16. PER-SURFACE RULES

The four surfaces have different users, devices and priorities. Do not apply one set of rules to all four. See the tiering table in §5.

### 16.1 Patient (mobile-first)
- **SURF-1** — Mobile-first. Every rule in this document applies at full strength.
- **SURF-2** — Optimised for **one-handed use on a 360px screen** in a hurry, possibly on bad network, possibly by someone anxious.
- **SURF-3** — Guest browsing is mandatory (NAV-4). Auth is OTP-first.
- **SURF-4** — No feature requiring a desktop. Nothing gated behind "please visit our website".

### 16.2 Clinic / front-desk dashboard (desktop-first, tablet-capable)
- **SURF-5** — Desktop-first at **1366px**, but fully usable on a **tablet at 768px** — front-desk staff use tablets constantly.
- **SURF-6** — **Keyboard-first.** Front-desk staff are power users doing the same action 200 times a day. Every frequent action needs a shortcut and a documented shortcut list. Speed beats beauty here. Booking an appointment for an existing patient: **≤ 4 interactions.**
- **SURF-7** — The day/appointment view MUST support **bulk actions** (reschedule multiple, mark no-show, block a range) — never one-at-a-time-only.
- **SURF-8** — Every table MUST have sort, filter, column visibility, pagination and **CSV export**. Non-negotiable; every clinic asks.
- **SURF-9** — Real-time or near-real-time queue updates. A receptionist looking at a stale list is worse than no list.
- **SURF-10** — Destructive actions MUST be **undoable** for ≥ 10 seconds, or require typed confirmation. Staff misclick.
- **SURF-11** — Dense-by-default layout. Compact MUI density. Optimise for information per screen, not whitespace.
- **SURF-12** — MUST work on the clinic's actual hardware: old Windows machines, small screens, Chrome a few versions behind. Test on a low-spec Windows laptop.
- **SURF-13** — Print MUST work properly for day schedule, patient list, receipt, prescription. A dedicated print stylesheet is required. Indian clinics print. **Preview and `window.print()` MUST share one rendering path** — two paths drift.

### 16.3 Manager (multi-branch)
- **SURF-14** — Every screen MUST have a clear, persistent **location scope indicator**. Ambiguity about which branch you're editing causes real damage.
- **SURF-15** — Read-heavy: cross-location comparison, staff utilisation, revenue. Charts MUST be lazy-loaded (PERF-12) and MUST have an accessible data-table equivalent.

### 16.4 Admin / Superadmin
- **SURF-16** — **Every destructive or cross-tenant action requires typed confirmation** (type the clinic name to delete it). No plain "OK" for anything affecting a tenant.
- **SURF-17** — When impersonating, a **loud, persistent, unmissable banner** MUST be visible at all times with a one-click exit. A silent impersonation session is a serious incident waiting to happen.
- **SURF-18** — Admin surfaces MUST show who changed what and when wherever data is editable. Surface the audit trail in the UI.
- **SURF-19** — Admin bundles MUST NOT be reachable from the patient build. Separate route entry, separate chunk, permission-gated at the router level — **and** enforced server-side (SEC-18).
- **SURF-20** — Every permission-gated element MUST be **absent**, not merely disabled, for users without the permission.

---

## 17. CODE ARCHITECTURE & REPO RULES

- **ARCH-1** — **New features are organised by feature, not by file type.** A new feature of more than ~3 files lives in `src/features/<name>/` with its own components, hooks, graphql and constants. *Documented deviation:* the existing tree is organised by type (`src/pages/`, `src/components/`, `src/hooks/`, `src/graphql/`) across 170 files. That is not being reorganised wholesale — see §22. Do not add to the problem.
- **ARCH-2** — A feature MUST NOT import another feature's internals. Cross-feature use goes through the feature's public `index.js`. Enforce with an import-boundary lint rule.
- **ARCH-3** — Shared code lives in `src/shared/` or the existing `src/components|hooks|utils|apollo|theme`. Everything there MUST be genuinely generic with no feature knowledge.
- **ARCH-4** — Surfaces (`patient`, `clinic`, `manager`, `admin`) SHOULD be separate lazy route trees so their bundles stay separate (PERF-3). *Currently one shared tree in `App.jsx` — see §22.*
- **ARCH-5** — One component = one responsibility. If a component both fetches and renders complex logic, split it into a container hook + a presentational component.
- **ARCH-6** — Business logic lives in hooks or plain functions, **never in JSX**. If a JSX return contains a calculation, extract it.
- **ARCH-7** — **Every API response MUST be validated at runtime at the boundary, with zod.** This is the primary type-safety mechanism in a JS codebase (BASE-3) — not a nice-to-have. Do not trust the backend's shape. A validation failure logs loudly and maps to a user-facing error via STATE-6. New GraphQL-consuming modules define a zod schema for their response shape; a schema drift then fails fast and visibly instead of surfacing as `undefined` three components deep.
- **ARCH-8** — No magic strings or numbers. Route paths, query keys, event names, status values and storage keys are typed constants in one place.
- **ARCH-9** — Naming: components `PascalCase`, hooks `useCamelCase`, constants `SCREAMING_SNAKE`, files match their default export. Booleans read as predicates (`isLoading`, `hasError`, `canCancel`).
- **ARCH-10** — Comments explain **why**, never what. Delete commented-out code — that's what git is for.
- **ARCH-11** — `console.log` MUST NOT reach `master`. Use a level-gated logger stripped in production. Enforced by lint.
- **ARCH-12** — `TODO` comments MUST include a ticket ID and an owner, or they don't merge.
- **ARCH-13** — Every PR SHOULD be under **400 changed lines**. Large PRs get reviewed badly, and badly-reviewed PRs are where these rules die.
- **ARCH-14** — Feature flags for anything risky, with a documented removal date. Dead flags cleaned up within one release of full rollout.
- **ARCH-15** — **Match the existing contract; do not invent a "reasonable" one.** Before writing or changing a component that talks to the backend, read `src/graphql/*.js` (or the page's inline `gql`) verbatim for field names, nullability, argument shape, and which mutation-response convention the consuming page expects. This codebase has **two GraphQL naming dialects** (canonical snake_case; public/patient camelCase) and **three mutation-response conventions**, all deliberate. Skipping this check has caused real, shipped bugs — including a mutation whose argument shape was wrong from the day it shipped, making the whole feature non-functional.

---

## 18. TESTING & CI GATES

A rule CI doesn't check is a suggestion. These gates make this document real.

**Currently enforced in `.github/workflows/ci.yml`** — frontend job runs `npm run lint` (ratcheted), `npx prettier --check .`, `npm test`, `npm run build`, `npm run size`; a `secrets` job runs `gitleaks`; a structural job runs `check-page-data-wiring.mjs`. Backend runs unit, integration, schema and lint. Everything below marked ⛔ is **not yet wired** and is the gap to close.

- **CI-1** — *(replaces the TS compile gate)* `npm run build` MUST succeed with zero errors. Vite build failure blocks merge. ✅
- **CI-2** — ESLint passes with **zero errors**, and the warning ratchet (`--max-warnings <N>`) does not increase. **The ratchet may only ever decrease.** Includes `jsx-a11y` and all custom rules referenced here. ✅
- **CI-3** — Prettier formatting check passes. Formatting is never discussed in review. ✅ *(P1-03 — the whole tree was reformatted once, `.prettierrc.json`/`.prettierignore` added, wired as `npx prettier --check .`)*
- **CI-4** — Unit tests pass. Coverage on booking and all payment logic **≥ 80%**; elsewhere ≥ 60%. *(Tests pass today; coverage is not gated.)* ⛔ *partial*
- **CI-5** — Bundle size within budget via `size-limit`. ✅ *(P1-03 — `.size-limit.json`, three budgets: initial bundle 335 KB / largest lazy chunk 115 KB / initial CSS 18 KB gzipped. Calibrated to today's measured reality — same as the lint ratchet's own philosophy — not the PERF-1…4 aspiration (180–200 KB initial, 100 KB/chunk); ratchet down from here, don't treat these as the target)*
- **CI-6** — Lighthouse CI meets PERF-5 thresholds on home, search, slot picker and confirmation routes. ⛔
- **CI-7** — `axe-core` reports zero critical or serious accessibility violations. 🟡 *(P1-03 — wired globally via `jest-axe`/`src/test/a11y.js`; live on 3 real page suites so far (booking wizard, admin/Communications, reset-password), not the full tree. Found and fixed 3 real defects the same pass: a booking-wizard doctor avatar with no `alt`, a Communications SMS-provider `Select` with no accessible name when unset, and a Communications heading sequence skipping h2→h5. One real, logged, NOT-fixed gap remains: the booking wizard's own heading order beyond its now-real `h1` — MUI's `subtitle1` variant also defaults to an `<h6>` tag, and re-leveling the whole page is out of this slice's scope; excluded via `expectNoA11yViolations`'s own `knownGapRuleIds` param, never silently)*
- **CI-8** — Visual regression snapshots pass at 320/360/768/1366px. ⛔
- **CI-9** — E2E happy path passes: **search → doctor → slot → OTP login → payment (mocked) → confirmation → cancel.** If this suite is broken, the pipeline is red and nothing else merges. *(45 Playwright specs exist but e2e is deliberately not in CI — it runs against a shared dev DB and leaves rows behind. Closing that is a prerequisite.)* ⛔
- **CI-10** — Translation key coverage: no missing keys for shipped languages. ⛔ *(blocked on §14)*
- **CI-11** — Secret scanning finds nothing. ✅ *(P1-03 — `gitleaks/gitleaks-action@v2`, default ruleset, no local install needed. Not yet locally smoke-tested — this repo's own CI has never executed on GitHub at all; this step shares that unproven status, not a new one)*
- **CI-12** — No new dependency added without the size check (BASE-5). ✅ *(P1-03 — `npm run size` in CI is exactly this check: a dependency that meaningfully grows the initial bundle or largest lazy chunk fails the build)*
- **CI-19** — **The page-data-wiring gate MUST pass**, and its `ALLOWED` exemption list MUST be re-verified whenever it is touched. A gate's exemption list is only as current as the last time someone re-read the file it exempts — a stale entry once hid a page that had been correctly wired for days. ✅

**Required manual checks before every release:**

- **CI-13** — Full booking flow on a **real low-end Android device on real mobile data**.
- **CI-14** 🔜 — Full booking flow **inside the mobile shell**, including a real payment app switch (PAY-11, WV-8).
- **CI-15** — Booking flow with **TalkBack** enabled (A11Y-9).
- **CI-16** — Booking flow in **Hindi** (I18N-4, I18N-7).
- **CI-17** — Airplane-mode test: open offline, confirm the experience matches DATA-8.
- **CI-18** 🔜 — Hardware back button walked through every screen (WV-2).

---

## 19. DEFINITION OF DONE

A ticket is not done until **every** applicable box is true. Paste into the PR template.

```
[ ] Declared the surface tier; verified at that tier's widths (§5)
[ ] All five states built: loading / empty / error / stale / success
[ ] Loading state is a skeleton with no layout shift
[ ] Keyboard accessible, visible focus, icon-only buttons have aria-label
[ ] Contrast >= 4.5:1; meaning never carried by colour alone
[ ] Touch targets >= 48px with >= 8px spacing
[ ] No hardcoded colours, spacing, or pixel breakpoints
[ ] Shared components/hooks declare contracts (JSDoc or propTypes) — BASE-10
[ ] API responses validated at the boundary with zod — ARCH-7
[ ] Checked src/graphql/*.js verbatim for the real contract — ARCH-15
[ ] Frontend route gate matches the backend resolver @Auth — SEC-18
[ ] List queries are paginated; mutations invalidate their lists — DATA-7, DATA-9
[ ] No mock/fabricated fallback on an empty result — DATA-13
[ ] Errors are human-readable; no codes or raw messages surfaced
[ ] Mutations are idempotent; double-tap cannot double-submit
[ ] zod form schemas have a failure-path test — FORM-19
[ ] Reader-facing free-text fields use a rich text editor, not a plain textarea — FORM-20
[ ] Bundle budget still green
[ ] No PII or health data in logs, URLs, or analytics
[ ] Unit + e2e tests written
[ ] Tested offline and on a throttled slow network
[ ] Tested on a real low-end Android device
```

---

## 20. THE RULES YOU WILL BE TEMPTED TO BREAK

Every team breaks the same rules under deadline pressure and pays for the same ones.

1. **"We'll add i18n later."** (I18N-1) — You won't, cheaply. It becomes a multi-month project touching every file. **This is now the single largest latent cost in the frontend** — the layer does not exist and every new hardcoded string raises the price.
2. **"We'll require login first, it's simpler."** (NAV-4) — The most expensive convenience in this document. Forced login before value is a large, permanent, invisible conversion tax.
3. **"Just one more field on the form."** (FORM-1) — Every field costs completions. The person asking is not the person filling it in.
4. **"It works on my phone."** (CI-13) — Your phone is a flagship on office Wi-Fi. Your user is on a ₹9,000 Android in a basement clinic.
5. **"The designer wants this exact shade."** (UI-2) — One hardcoded hex becomes hundreds. Then dark mode and per-tenant branding are impossible — which is exactly the state the shipped org-branding feature is in.
6. **"Skip the slot hold, collisions are rare."** (BOOK-2) — They are not. Double bookings destroy clinic trust faster than any bug, and clinics are the customers who pay.
7. **"We'll do accessibility in v2."** (A11Y-1) — Users include the elderly and the unwell. This is the one product category where accessibility is the core use case. It also carries legal exposure.
8. **"Optimistic UI, it's faster."** (BOOK-19) — Not for money, not for bookings. A booking that shows confirmed and isn't is the worst possible failure in this product.
9. **"Add analytics/chat/heatmap, it's just one script."** (PERF-17) — Three "just one scripts" and every budget in §3 is gone permanently.
10. **"Hide the platform fee until checkout, conversion is better."** (BOOK-5, PAY-3) — Short-term lift, long-term refunds, bad reviews, churn. Healthcare users punish surprise pricing hardest.
11. **"We'll handle the back button globally later."** (WV-2) — Users will discover it first, mid-payment.
12. **"Just ship it, we'll fix perf after launch."** (PERF-18) — Performance is never retrofitted, only defended. Post-launch every fix competes with features and loses.
13. **"It's JS, we don't need the validation layer."** (BASE-3, ARCH-7) — This is the v2.0 addition. Choosing JS over TS is legitimate **only if the compensating controls are real.** Skipping zod at the boundary doesn't make you fast; it makes you a codebase with no type system at all.

---

## 21. RULE OWNERSHIP

| Section | Owner |
|---|---|
| Performance budgets (§3) | Tech lead |
| Design system / MUI (§4) | Design lead + frontend lead |
| Booking flow (§8) | Product owner |
| Accessibility (§13) | Frontend lead |
| Localisation (§14) | Frontend lead + product owner |
| Compliance (⚖️) | Legal + product owner |
| CI gates (§18) | DevOps + tech lead |
| JS compensating controls (BASE-3, ARCH-7, BASE-10) | Frontend lead |

Review **every quarter**. Delete rules that stopped being true. Add rules the hard way — every production incident should either map to a broken existing rule, or produce a new one. A rules file that never changes is a rules file nobody reads.

---

## 22. STANDING WAIVERS & KNOWN DEBT

Honest register of where the codebase does not comply, measured 27 Aug 2026. A rule listed here is **not** thereby optional — each line is either a funded plan or an explicit accepted risk. New code MUST comply even where old code does not.

| Rule | Measured state | Status |
|---|---|---|
| **BASE-3** (TypeScript) | 170 `.jsx`, 0 `.ts` | **Waived permanently — deliberate stack decision.** Compensating controls BASE-3(a–e), BASE-10, ARCH-7 are mandatory in exchange |
| **UI-2** (no hardcoded colour) | **126** lint warnings (re-measured 2026-08-29, down from 1,906 → 1,741 → 1,447 → 1,330 → 858 → 369 → 126 across this session's own sweep passes) — **every one of the remaining 126 is a confirmed, individually-verified, documented deliberate exception** (see below), not unswept debt. | **Phase 1–4 all DONE.** Rule enforced for new code; the ratchet may only decrease from here. **Phase 4 — staff/manager/admin, desktop-dense tier — DONE** (2026-08-29): ~40 files fully swept to 0 warnings this session (`finances/`, `messages/`, `admin/{users,Communications,Organizations,Policies}`, `staff/{edit,index,new}`, `reviews/`, `manager/Dashboard`, `analytics/`, `manager/clinics/{index,detail,create,edit}`, `patients/{detail,index,EditPatientPage,CreatePatientPage,detail-avatar}`, `waiting-room/`, `test-results/`, `dashboard/`, `notifications/`, `manager/services/{index,detail,edit,create}`, `clinicians/{Create,Edit}ClinicianPage`, `clinicians/index`, `manager/rooms/{detail,edit,create}`, `manager/products/{create,edit}`, `errors/not-found`), plus a stale `eslint-disable` and an unused `useTheme()` found and removed from `settings/index.jsx` during the closing full-project lint pass. Two real hard-rule additions came out of this phase, both under **UI-8** above: (a) a hex→token conversion must check the colour was ever brand-consistent, not just nearest-token-match (the finances "Export Report" button/Cash Drawer tab, `errors/not-found.jsx`'s own "Google Blue" 404, and several create/edit header icon-pills all shipped off-brand blue this way — all now converted to `primary`); (b) `MuiAlert`'s own dark-mode default background can render darker than its container card, which reads as a missing-spacing bug but is actually a contrast bug — fixed via a new `theme.components.MuiAlert` override, not by touching any margin. **The remaining 126 warnings are final, not a to-do list** — re-verify with `npx eslint src/pages src/components src/layouts` before assuming this count has drifted, but do not "fix" any of the following without re-confirming they are still deliberate: `layouts/AppShell.jsx` (38, fixed sidebar/nav chrome + one already-fixed impersonation banner), `settings/index.jsx` (12, `ACCENT_COLORS`/org-branding colour pickers), `components/Clinicians/{ClinicianCard,ClinicianProfileDrawer}.jsx` + `components/Dashboard/{RecentAppointmentsTable,ServicePieChart}.jsx` (32, fixed per-item avatar/chart-slice hue palettes), `layouts/PublicLayout.jsx` (7, marketing footer), `pages/video/index.jsx` (7, always-dark video-call theme + black feed surface), `components/ConfettiExplosion.jsx` (6, decorative confetti), `components/Calendar/CalendarView.jsx` (4, white text on saturated status-colour event chips), `pages/admin/users/index.jsx` (4, terminal/JSON audit-log viewer), `pages/auth/{login,forgot-password,reset-password}.jsx` (7, BrandPanel), `pages/public/landing.jsx` (3, marketing hero), `pages/prescriptions/PrescriptionPrint.jsx` (2, printed-paper document), `pages/queue/display.jsx` (2, TV/kiosk waiting-room display), `pages/patients/detail.jsx` (1, WhatsApp's own brand green), `pages/settings/index.test.jsx` (1, a test asserting a literal stored accent-colour value, not app UI). Six now-established deliberate-exception categories, to recognise on sight rather than re-litigate: marketing/brand panels, terminal/code-viewer boxes, fixed sidebar/nav-rail chrome, user-selectable colour pickers, fixed per-item identity palettes (avatars/chart slices/status dots), and physical-output surfaces (print documents, TV/kiosk displays, video-call feeds) — each is independent of the app's own light/dark toggle by real-world convention, not an oversight. Recurring fix patterns worth keeping for the next hardcoded-colour sweep found elsewhere in the codebase: (1) a per-status/per-role hex map (STATUS_CONFIG-shaped) becomes a `xxxFor(theme, key)` function reusing `alpha(main, mode==='dark'?0.18:0.12)`; (2) a widely-referenced module-level brand constant (`TEAL`, `BRAND`) used in dozens of template-literal/prop call sites is safest fixed by redeclaring it *inside* the component as `theme.palette.primary.main`, not by touching every call site; (3) a component consuming `theme.palette.appointmentStatus` needs a real `<ThemeProvider theme={createAppTheme(...)}>` in its test, not a bare render with no theme at all; (4) `.jsx`-only lint can never catch a hardcoded colour in a global `.css` file. |
| **UI-14** (≤250 line component) | **68 files** over 250 lines; largest 1,641 (`settings/index.jsx`) | Accepted debt. New components comply; touched files should shrink |
| **SEC-2** (no token in localStorage) | **Closed 2026-08-27, P1-02/REQ145.** Tokens live in httpOnly cookies; only a non-sensitive session marker + cached user object remain in web storage | — |
| **I18N-1…10** | No i18n layer at all | Not started. Cost grows with every commit — see §20.1 |
| **WV-1…18** (except 5,6,13,16,17) | No Capacitor shell | 🔜 Conditional. Not applicable until the shell exists |
| **ARCH-1 / ARCH-4** (feature folders, per-surface bundles) | Organised by type; one shared route tree | Deviation documented. New features use `src/features/`; no wholesale reorganisation planned |
| **PERF-1…4** (bundle budgets) | **`size-limit` wired 2026-08-27 (P1-03)** — calibrated to today's reality (335/115/18 KB gzipped), not the aspiration | Ratchet down from the measured baseline, same discipline as UI-2's own lint count |
| **CI-3,5,11,12** | **Wired 2026-08-27 (P1-03).** prettier, size-limit, gitleaks, dependency-size-via-size-limit | ✅ |
| **CI-6,8,10** | Not wired | Gap. See §18 |
| **CI-7** (`axe-core`) | **Partially wired 2026-08-27 (P1-03)** — 3 real page suites (booking wizard, admin/Communications, reset-password), not the full tree | Extend to more pages incrementally; each pass so far has found real bugs (2/3 suites did, this slice) |
| **CI-9** (e2e in CI) | 45 specs exist, deliberately not gated — shared dev DB, leaves residue | Blocked on test-data isolation |
| **A11Y-1** (`axe-core` zero violations, full tree) | 3 of ~90 page suites covered | Same gap as CI-7 above, from the rule side |
| **FORM-20** (rich text editor for reader-facing free text) | No rich text editor library in the codebase; all 58 `multiline` fields are plain `TextField` | New as of 2026-08-29. Applies to new fields from today; existing reader-facing fields (encounter notes, prescription instructions, messages, email templates) retrofit incrementally, own future slice |
| **UI-5/UI-8** (`src/index.css` global hardcodes) | Found 2026-08-29 sweeping `appointments/index.jsx`'s DataGrid: a global, `!important`-laden `.MuiDataGrid-*` block silently beat every theme-aware `sx` override on that page, rendering unreadable dark-on-dark cell text — the exact "never a global CSS file, never `!important`" violation UI-5 already named. Fixed (moved to a `theme.components.MuiDataGrid` override reusing the same `tableHeadBg`/`rowHoverBg` tokens `MuiTableHead`/`MuiTableRow` already share) and the `.recharts-*`/`.fc-*` (FullCalendar) blocks — both real, both actively rendering on live pages (dashboards' charts; `calendar/index.jsx`) and both untouchable by a `theme.components` override since they render outside MUI's tree — given `[data-theme='dark']` variants instead, backed by a new `data-theme` attribute `context/ThemeContext.jsx` now sets on `<html>` for exactly this "3rd-party DOM, plain-CSS-only" case. **Not yet audited**: the rest of this same file — hardcoded `body`/`#root` background+text (likely harmless, `MuiCssBaseline`'s own injected rule probably wins the cascade, but not proven either way), scrollbar-thumb colours, and a block of entirely dead, unused-anywhere classes (`.status-*`, `.tag-*`, `.skeleton-shimmer`, `.hover-card`, `.card-lift`) safe to delete outright once confirmed still unreferenced. Re-run `grep -n "#[0-9a-fA-F]\{3,6\}" src/index.css` before trusting this line — a hardcoded-colour lint pass over `.jsx` files can never catch this class of bug, since ESLint's `no-hardcoded-colors` rule doesn't scan `.css` files at all. |

---

*Version 2.0 · Rewritten for JS/JSX · Owner: Frontend Lead · Review: quarterly*
*Rule IDs are stable from v1.0. Companion documents: `project-plans/technical-plans/06-frontend-architecture-and-mobile.md` (tiering, overflow probe, PWA) · `project-plans/technical-plans/07-frontend-rules-compliance.md` (per-rule audit) · skill `medibook-frontend-rules`.*
