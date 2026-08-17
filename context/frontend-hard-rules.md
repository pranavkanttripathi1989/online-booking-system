# Frontend Hard Rules

**These are mandatory, not suggestions.** Every rule below is grounded in an actual audit of `frontend/src` (not generic boilerplate) — each one cites the real inconsistency it closes. A frontend change that violates a hard rule is not done, regardless of whether it "looks right" in one viewport or passes a quick glance.

**Audit this is based on:** see the "Frontend Conventions Audit" findings folded into each section below. Re-run a similar audit periodically — these rules should tighten over time, not just once.

---

## 1. Responsiveness — mandatory, verified, not assumed

**Rule 1.1 — Every layout value that can differ by viewport must use MUI's responsive `sx` object syntax** (`{ xs: ..., sm: ..., md: ... }`), never a single fixed value assumed to work everywhere. No custom breakpoints exist (`theme.js` uses MUI defaults: xs/sm/md/lg/xl) — use those, don't invent new ones.

**Rule 1.2 — No fixed-pixel widths on interactive/input elements without a responsive override.** Real violation found and must be fixed as part of any touch to that file: `manager/clinics/index.jsx:113` — `<SearchField sx={{ width: 260 }} />` will overflow on narrow viewports. Any element like this needs `width: { xs: '100%', sm: 260 }` or equivalent.

**Rule 1.3 — The Sidebar/Navbar drawer pattern is the only acceptable nav pattern**, full stop. `components/Layout/Sidebar.jsx` already implements this correctly (`Drawer variant="temporary"` for mobile, `variant="permanent"` for desktop, triggered by `Navbar`'s `onMobileMenuClick`, plus a `MobileBottomNav` with `Layout.jsx`'s `pb: { xs: '80px', md: 3 }` reservation). Any new layout/nav work reuses this exact pattern — never a bespoke nav solution per page.

**Rule 1.4 — Verification is a screenshot at real viewport widths, not a claim.** Before calling any page/component "responsive," drive it with Playwright at minimum: **375px** (mobile), **768px** (tablet), **1024px** (small desktop), **1440px** (desktop). Screenshot each, look at it. "I used the `sx` breakpoint syntax" is not verification — a screenshot showing no overflow/clipping/overlap at all four widths is. This mirrors how the onboarding wizard and Settings branding feature were verified earlier this session — that bar applies to everything now, not just those two.

**Rule 1.5 — Touch targets ≥ 44×44px on any element usable at `xs`/`sm`.** Icon buttons, chips, and small interactive elements that are fine on desktop with a mouse routinely fail this on mobile — check explicitly, don't eyeball it.

---

## 2. Form validation — react-hook-form + zod, no exceptions on new work

**Current state (audited): only 4 of ~31 forms actually use `react-hook-form` + `zodResolver` + `zod`** (`Settings/ClinicProfileForm.jsx`, `BookingWizard/BookingStep4Patient.jsx`, `Clinicians/ClinicianFormDrawer.jsx`, `patients/index.jsx`). The other ~27 (`login.jsx`, every `pages/admin/*.jsx` form, `manager/Availability.jsx`, `Blocks.jsx`, `CreatePatientPage.jsx`/`EditPatientPage.jsx`, `CreateClinicianPage.jsx`/`EditClinicianPage.jsx`, etc.) do manual regex/`if`-check validation against local `useState`. Both dependencies are already installed — this is an adoption gap, not a tooling gap.

**Rule 2.1 — Every new form uses `useForm` + a `zod` schema + `zodResolver`.** No new manual-regex/local-state validation, ever, starting now.

**Rule 2.2 — Every form you touch for any other reason gets migrated to RHF+zod as part of that change**, not left as-is "since it wasn't broken." This is how the 27-form backlog actually shrinks — opportunistically, not via a dedicated migration sprint that never gets prioritized.

**Rule 2.3 — Validation schemas live near the form, follow one naming convention**: `<FormName>Schema` exported from the same file or a co-located `schema.js`, so the pattern is discoverable and copy-paste-able for the next form.

**Rule 2.4 — Client-side validation is never the only validation.** Anything that eventually hits a real backend (Auth already does; everything else is still mocked) must assume the server re-validates independently — client-side zod schemas are a UX layer, not a security boundary. This mirrors `requirements/security-requirements.md` §4's input-validation stance on the backend side.

---

## 3. Accessibility — currently unenforced, now enforced

**Current state (audited): `aria-label` appears 131 times but looks accreted from incremental bug fixes, not systematic; `role=`/`tabIndex` appear in only 5-7 files; no `eslint-plugin-jsx-a11y` is installed; no a11y standard is documented anywhere.**

**Rule 3.1 — Install and enable `eslint-plugin-jsx-a11y` with its `recommended` ruleset** in `frontend/eslint.config.js`. This is the single highest-leverage fix in this whole document — it turns "remember to add aria-label" into "the linter fails the build if you forget." Do this before writing any more frontend components, not after.

**Rule 3.2 — Every icon-only button, custom clickable `<div>`/`<Box>`, and non-native interactive element gets an explicit `aria-label`** describing the action in context (e.g. `aria-label="Delete invoice INV-1024"`, not just `aria-label="Delete"`) — matches the pattern already correctly used in the fixed admin/clinics/rooms pages from earlier sessions.

**Rule 3.3 — Any element with `onClick` that isn't a native `<button>`/`<a>` needs `role="button"` and `tabIndex={0}` plus an `onKeyDown` handler for Enter/Space.** A clickable `<Box>` with no keyboard path is a real, shipped bug pattern (`dashboard/index.jsx`'s KPI cards needed exactly this fix earlier this session) — don't reintroduce it elsewhere.

**Rule 3.4 — Color contrast meets WCAG AA** (4.5:1 for normal text, 3:1 for large text/UI components) — this is already a stated requirement in `requirements/organization-branding-and-management-requirements.md` for tenant-chosen brand colors; it applies to every design decision in the app, not just tenant branding.

---

## 4. Error handling & loading states — pick one pattern, apply everywhere

**Current state (audited): `ErrorBoundary` wraps only ~13 places, almost entirely the `manager/` module family — dashboard, patients, appointments, calendar, settings, and onboarding have none. Loading state is split ~3:2 between bare `CircularProgress` and MUI `Skeleton` with no dominant convention. A shared `EmptyState` component exists but isn't universally adopted over inline "No X found" strings.**

**Rule 4.1 — Every top-level page component is wrapped in `ErrorBoundary`.** Not just `manager/*` — `dashboard`, `patients`, `appointments`, `calendar`, `settings`, `onboarding`, all of it. A page that white-screens on an unexpected error instead of showing a fallback is a bug, not an edge case.

**Rule 4.2 — Skeleton, not a bare spinner, for anything with a known content shape** (a list of cards, a table, a form that's about to be populated). Reserve `CircularProgress` for genuinely shapeless waits (a button's own in-flight state, a full-page initial auth check). Use the existing `components/shared/Skeletons.jsx` — don't hand-roll a new skeleton per page.

**Rule 4.3 — Every empty state uses the shared `EmptyState` component**, not an inline string. If `EmptyState` doesn't support a needed variant, extend it — don't bypass it.

---

## 5. Testing — the tooling exists, nothing uses it yet

**Current state (audited): `jest`, `@testing-library/react`, `@testing-library/user-event`, and `@playwright/test` are all installed and `package.json` has `test`/`test:watch`/`e2e`/`e2e:ui` scripts — but there is no `jest.config.*`, no `playwright.config.*`, and zero test files anywhere. Running `npm test` today fails outright.** This is the most urgent gap in this whole document because everything else is "do it better going forward" — this one is "the thing doesn't exist at all."

**Rule 5.1 — Before any further frontend feature work, stand up the actual test configs**: a working `jest.config.js` (or Vite-native equivalent) that can run a `.test.jsx` file, and a `playwright.config.js` pointed at the dev server. This is infrastructure, not optional polish — do it first, once, so every rule below is actually checkable.

**Rule 5.2 — Every new component ships with at least one Testing-Library render test** (renders without throwing, key interactive elements are present and labeled) — not full coverage, but not zero either.

**Rule 5.3 — Every new page ships with at least one Playwright smoke test**: navigate to it, assert the primary content renders, exercise the one representative interaction (matches the "drive it, don't just launch it" standard already used manually via the `run` skill this session — the difference is this becomes a committed, repeatable test file instead of an ad hoc verification script in a scratchpad).

**Rule 5.4 — Test files live next to what they test** (`Component.jsx` + `Component.test.jsx` in the same folder) for unit/component tests; Playwright specs live under a top-level `e2e/` or `tests/` folder mirroring the route structure.

---

## 6. Component & file structure — one convention, not two

**Current state (audited): `manager/{clinics,rooms,services}/` correctly follow `index.jsx`/`create.jsx`/`detail.jsx`/`edit.jsx` (lowercase); `patients/` and `clinicians/` break this with `CreatePatientPage.jsx`/`EditPatientPage.jsx` (PascalCase, `Page`-suffixed) instead.**

**Rule 6.1 — Every new CRUD feature folder uses the lowercase `index.jsx`/`create.jsx`/`detail.jsx`/`edit.jsx` convention**, matching `manager/*`, not the `patients`/`clinicians` naming.

**Rule 6.2 — Don't rename `patients`/`clinicians`'s existing files just to fix the inconsistency** unless you're already touching those specific files for a real feature reason — a pure rename-only PR is churn for its own sake, not a hard rule violation worth a dedicated pass.

**Rule 6.3 — Shared, reusable components live in `components/shared/`; anything domain-specific lives in its own PascalCase domain folder** (`components/Appointments/`, `components/BookingWizard/`, etc.). Before adding a new component, check `components/shared/` first — `EmptyState`, `DataCard`, `StatusChip`, `SearchField`, `Skeletons` already exist; don't recreate them inside a domain folder.

---

## 7. Mock-vs-real data — the pattern stays until a backend actually exists, then it fully leaves

**Current state (audited): the mock/GraphQL dual-path (`useMockData`/`useMockMutation`/`MockStore`, `apollo/client.js`'s 10s fallback timeout) is still the dominant pattern everywhere except Auth, which was fully graduated to the real backend this session with zero remaining mock references.**

**Rule 7.1 — New work on a domain with no backend yet follows the existing mock pattern exactly** (`useMockData`/`useMockMutation`, a `// BACKEND SWAP:` comment marking what changes later) — don't invent a new mocking approach per feature.

**Rule 7.2 — The moment a domain's real backend ships (as Auth's did), every mock reference for that domain is removed in the same change**, not left "just in case." `login.jsx`/`forgot-password.jsx` already demonstrate the target end-state: zero `MockStore`/`useMockData`/`useMockMutation` references. Half-migrated files (some mock, some real, no clear reason why) are worse than fully-mock or fully-real.

---

## Definition of Done (applies to every frontend change, not a subset)

A frontend page or component is not done until all of the following are true — this is the operational form of the rules above, meant to be checked literally, not interpreted loosely:

- [ ] Responsive at 375/768/1024/1440px, verified via Playwright screenshot, not assumed (§1.4)
- [ ] No fixed-pixel widths on interactive elements without a responsive override (§1.2)
- [ ] Forms use `react-hook-form` + `zod` (§2.1/2.2)
- [ ] Every icon-only/custom-clickable element has a contextual `aria-label`; custom clickables have `role`/`tabIndex`/keyboard handling (§3.2/3.3)
- [ ] `eslint-plugin-jsx-a11y` passes with no new warnings (§3.1)
- [ ] Wrapped in `ErrorBoundary` (§4.1)
- [ ] Loading state uses `Skeleton` (content-shaped) or `CircularProgress` (genuinely shapeless) appropriately, never both inconsistently on the same page (§4.2)
- [ ] Empty states use the shared `EmptyState` component (§4.3)
- [ ] At least one Testing-Library test (component) and one Playwright smoke test (page) exist for the change (§5.2/5.3)
- [ ] File/folder naming matches §6's convention for any new CRUD feature
- [ ] Mock/real data boundary is clean — no half-migrated files (§7.2)
