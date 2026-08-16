# Settings — Test Cases

**Domain covers:** the generic Profile page (`/profile`), the Patient Profile page (`/patient/profile`), the Settings page's Account/Security/Appearance/Notifications/Clinic tabs (`/settings`), global date/time formatting conventions, header navigation, and the net-new **Organization Branding** capability added to Settings → Clinic tab this session (logo upload + primary/secondary color pickers).
**Grounded in:** `test-plan/settings-test-plan.md` + `test-plan/core/settings-test-plan-done.md`, `test-plan/profile-test-plan.md` + `test-plan/core/profile-test-plan-done.md`, `test-plan/patient-profile-test-plan.md` + `test-plan/patient-portal/patient-profile-test-plan-done.md`, `test-plan/date-time-format-test-plan.md` + `-done.md`, `test-plan/header-navigation-test-plan.md` + `-done.md`, their `test-result/`/`test-suggestion/` counterparts, `requirements/organization-branding-and-management-requirements.md`, and direct inspection of `frontend/src/pages/settings/index.jsx`, `frontend/src/mocks/store.js`, `frontend/src/context/AuthContext.jsx`, and `schema.prisma`'s `ClientOrganizations` model.
**Key facts driving the branding section:**
- Branding data (`{logo_url, primary_color, secondary_color}`) is meant to live inside `ClientOrganizations.settings` (existing `Json` column, no schema change needed per the requirements doc) — but the current mock implementation (`getOrganizationBranding`/`updateOrganizationBranding` in `mocks/store.js`) instead stores it under an ad-hoc `org.branding` property, not nested under `settings` at all.
- The logo-upload input (`accept="image/png,image/jpeg,image/svg+xml"`) has **zero validation** — no file-size limit, no dimension/aspect-ratio check — despite a UI caption claiming "SVG or PNG, square, at least 256×256px". This is a stark contrast to the same file's own avatar-upload path (2MB limit) and the separate `/profile` page's photo path (5MB limit).
- The two color pickers pair a native `<input type="color">` swatch with a free-text MUI `TextField` bound to the same state — the text field accepts any string with no hex-format validation.
- No plan-tier gating exists anywhere in the branding UI or mock data, despite the requirements doc's Starter/Pro/Enterprise gating table (Starter = logo only; Pro+ = logo + full color scheme) — every user sees full logo + both color pickers regardless of `org.plan`.
- `orgId` resolution is `user?.organisation?.id ?? 'org-1'` — every seeded mock user whose `organisation` is `null` (admin, clinicians, staff, patient accounts) silently falls back to editing/viewing **org-1's real branding data** (Meridian Health Group) if they ever load the Clinic tab.
- No numeric WCAG contrast ratio is stated anywhere in the requirements doc or `context/backend-implementation-plan.md` — both only say "WCAG AA," so tests here treat the standard 4.5:1 (normal text) / 3:1 (large text) thresholds as the assumed target pending explicit confirmation.

---

## 1. Unit Test Cases

### TC-SET-UNIT-001 — Password-change validation order is deterministic
- **Priority:** High
- **Preconditions:** Grounded in a real, confirmed cross-page inconsistency: `/profile`'s password tab checks mismatch → length → strength → empty-current (mismatch first); `/settings`'s Account tab checks empty-current → length → mismatch (mismatch last).
- **Steps:** Call the canonical password-change validator with `currentPassword: ""`, `newPassword: "short"`, `confirmPassword: "different"` (all three violations present simultaneously).
- **Expected Result:** Returns exactly one error, in a single documented priority order (e.g. empty-current first, since it's a precondition for evaluating the new password at all) — this unit test exists to force `/profile` and `/settings` onto one shared validator with one agreed order, rather than the two divergent inline implementations found in the current code.

### TC-SET-UNIT-002 — Password strength requires uppercase + digit, consistently
- **Priority:** High
- **Preconditions:** `/profile`'s password tab rejects `"aaaaaaaa"` (8 lowercase chars, no uppercase/digit) via `!/[A-Z]/.test(pw) || !/[0-9]/.test(pw)`; `/settings`'s Account tab has no such check at all (only a length ≥8 check).
- **Steps:** Call the canonical strength validator with `"aaaaaaaa"`, `"Aaaaaaaa"` (uppercase, no digit), `"Aaaaaaa1"` (both present).
- **Expected Result:** First two rejected, third accepted — and this single validator must be the one both `/profile` and `/settings` invoke, closing the gap where Settings' Account tab currently allows an 8-character all-lowercase password with no uppercase/digit requirement.

### TC-SET-UNIT-003 — Avatar/logo file-size guard applies one consistent limit
- **Priority:** High
- **Preconditions:** Three different size limits currently coexist in the codebase for conceptually similar uploads: `/profile` photo = 5MB, `/settings` avatar = 2MB, Branding logo = **no limit at all**.
- **Steps:** Call a canonical `validateImageUpload(file, maxSizeMB)` with a 3MB file against each of the three call sites' intended limits.
- **Expected Result:** Each call site enforces its own explicitly documented limit (this test doesn't mandate unifying the numbers, but does mandate that every call site actually has a limit) — specifically, the Branding logo path must gain a real `maxSizeMB` argument where today it has none.

### TC-SET-UNIT-004 — Logo dimension/aspect-ratio validator matches its own UI copy
- **Priority:** Medium
- **Preconditions:** The Branding logo upload button's helper caption reads "SVG or PNG, square, at least 256×256px," but no code anywhere enforces "square" or a minimum dimension.
- **Steps:** Call `validateLogoDimensions(width: 100, height: 400)` and `validateLogoDimensions(width: 128, height: 128)`.
- **Expected Result:** The first (non-square, and below 256px) is rejected; the second (square, but below the 256px minimum) is also rejected — this unit test specifies the validator that must be built and wired to actually back the existing UI copy, which currently makes an unenforced promise.

### TC-SET-UNIT-005 — Hex color validator rejects non-hex free text
- **Priority:** High
- **Preconditions:** The Branding color TextFields accept arbitrary text with no validation (e.g. typing `"banana"` breaks the Save button's own live-gradient preview, since `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` receives an invalid CSS color value).
- **Steps:** Call `isValidHexColor("banana")`, `isValidHexColor("#GGGGGG")`, `isValidHexColor("#006D77")`, `isValidHexColor("006D77")` (missing `#`).
- **Expected Result:** First two rejected, third accepted, fourth rejected (must include the leading `#`) — specifies the validator that must gate both the color `TextField`'s `onChange`/`onBlur` and the save mutation.

### TC-SET-UNIT-006 — WCAG AA contrast check rejects a primary/secondary pair with insufficient contrast against white text
- **Priority:** Critical
- **Preconditions:** Requirements doc §3.4 mandates "server-side WCAG AA contrast check on the chosen colors against white/black text before saving" but states no specific numeric ratio; this test assumes the conventional WCAG AA thresholds (4.5:1 normal text, 3:1 large text) pending explicit confirmation from product.
- **Steps:** Call `checkWcagContrast(primary: "#FFFFFF", secondary: "#FFFFFF")` (white-on-white, the requirements doc's own example of an unreadable pair) and `checkWcagContrast(primary: "#006D77", secondary: "#00858F")` (the current teal defaults).
- **Expected Result:** The white/white pair fails the 4.5:1 threshold against white text; the teal defaults pass — this test both validates the calculation and locks in the assumed numeric threshold so it can be explicitly corrected if product specifies otherwise.

### TC-SET-UNIT-007 — Plan-tier branding-depth resolver
- **Priority:** High
- **Preconditions:** Requirements doc §3.3: Starter = logo only; Pro = logo + full color scheme, attribution removed; Enterprise = Pro + custom domain. `SubscriptionPlans.features` currently has no branding-related entries on any tier.
- **Steps:** Call `getBrandingCapabilities(planCode: "starter")`, `("pro")`, `("enterprise")`.
- **Expected Result:** Starter → `{logo: true, colors: false, customDomain: false, attributionRemoved: false}`; Pro → `{logo: true, colors: true, customDomain: false, attributionRemoved: true}`; Enterprise → `{logo: true, colors: true, customDomain: true, attributionRemoved: true}` — this is the resolver function that must back both the UI's conditional rendering (currently absent) and the backend mutation's server-side enforcement.

### TC-SET-UNIT-008 — Branding org-scope resolver never falls back to a hardcoded organization id
- **Priority:** Critical
- **Preconditions:** Grounded in a real, confirmed cross-tenant risk: the current implementation is `const orgId = user?.organisation?.id ?? 'org-1'` — any user without an organization silently resolves to editing Meridian Health Group's (org-1) real branding.
- **Steps:** Call the corrected org-scope resolver with a user object where `organisation` is `null`.
- **Expected Result:** Returns `null`/throws, never `'org-1'` — the caller (UI or resolver) must then render a "no organization" empty/disabled state rather than silently attaching to an arbitrary tenant's data. This is the single most safety-critical unit test in this domain.

### TC-SET-UNIT-009 — Date/time formatter never falls back to 24-hour or ISO format in visible UI
- **Priority:** High
- **Preconditions:** The canonical standard (`frontend/src/utils/dateTime.js`) is `DD/MM/YYYY` dates and `h:mm A` (12-hour) times; `dateUtils.js` is deprecated in favor of it.
- **Steps:** Call `formatDate(new Date('2026-08-17'))` and `formatTime(new Date('2026-08-17T14:30:00'))`.
- **Expected Result:** Returns `"17/08/2026"` and `"2:30 PM"` respectively — never `"2026-08-17"` or `"14:30"`.

### TC-SET-UNIT-010 — Relative-time formatter handles null and long-elapsed inputs safely
- **Priority:** Medium
- **Steps:** Call `formatRelativeTime(null)` and `formatRelativeTime(dateFromDaysAgo(10))`.
- **Expected Result:** `null` input returns `"—"` (not a crash, not "NaN days ago"); a 10-day-old timestamp falls back to `formatShortDate` output (the function's documented behavior of switching to an absolute short date at ≥7 days elapsed) rather than an absurd "10 days ago" string that never resolves to a real date for the user.

### TC-SET-UNIT-011 — Currency formatter defaults and null-handling
- **Priority:** Medium
- **Preconditions:** `formatCurrency(amount, currency='GBP')` currently defaults to GBP — inconsistent with CLAUDE.md's India/INR/paise mandate that should apply platform-wide, including any currency figures that might appear in Settings (e.g. plan pricing).
- **Steps:** Call `formatCurrency(null)` and `formatCurrency(2875000, 'INR')` (paise input).
- **Expected Result:** `formatCurrency(null)` returns a safe zero-value string (not `"NaN"` or a crash); `formatCurrency(2875000, 'INR')` returns `"₹28,750.00"` — this unit test also flags that the *default* currency argument itself should be reconsidered given the India-market mandate, not just the explicit-argument path.

### TC-SET-UNIT-012 — Email-template-variable-style validation does not apply here, but organization code slug normalization does
- **Priority:** Low
- **Steps:** Call the Settings page's organization-identifier normalizer (shared with Admin's `normalizeOrgCode`, TC-ADMIN-UNIT-008) on `"  My Clinic!! "`.
- **Expected Result:** Returns `"my-clinic"` — verifies Settings' Clinic tab, if it ever exposes an editable org code/slug, reuses the same normalization logic as the Admin Organizations CRUD screen rather than a third divergent implementation.

---

## 2. Backend/API Test Cases

*Run against a real Postgres test database + the actual GraphQL schema, not mocks.*

### TC-SET-API-001 — `updateOrganizationBranding` persists inside `ClientOrganizations.settings`, not a new top-level column
- **Priority:** High
- **Steps:** Call `updateOrganizationBranding(orgId, {logo_url, primary_color, secondary_color})`, then query `organization(id: orgId) { settings }`.
- **Expected Result:** The returned `settings` JSON contains a `branding: {logo_url, primary_color, secondary_color}` key — matching the requirements doc's documented persistence location, not the mock's ad-hoc `org.branding` top-level property (which has no backing column and must not be replicated as a real schema change).

### TC-SET-API-002 — `updateOrganizationBranding` enforces server-side WCAG AA contrast validation
- **Priority:** Critical
- **Steps:** Call `updateOrganizationBranding(orgId, {primary_color: "#FFFFFF", secondary_color: "#FFFFFF"})`.
- **Expected Result:** Rejected with a validation error referencing insufficient contrast — this is the server-side enforcement point the requirements doc explicitly calls for and which the current client-only mock implementation entirely lacks (no contrast check exists anywhere in the shipped code today).

### TC-SET-API-003 — `updateOrganizationBranding` is scoped to the caller's own organization
- **Priority:** Critical
- **Preconditions:** Manager A belongs to Org 1; Manager B belongs to Org 2.
- **Steps:** Log in as Manager A, call `updateOrganizationBranding(orgId: Org2.id, {...})`.
- **Expected Result:** Rejected `FORBIDDEN` — a manager may only update their own organization's branding, never another tenant's. This is the real-backend closure of the mock-mode cross-tenant risk identified in TC-SET-UNIT-008/TC-SET-FE-009.

### TC-SET-API-004 — `updateOrganizationBranding` rejects a logo exceeding the size limit
- **Priority:** High
- **Steps:** Attempt the mutation with a logo payload/upload exceeding the agreed size limit (per TC-SET-UNIT-003).
- **Expected Result:** Rejected with a clear file-size error — server-side enforcement independent of (and not solely reliant on) the client-side guard, since the current client path has none at all.

### TC-SET-API-005 — `updateOrganizationBranding` depth is gated by the organization's subscription plan
- **Priority:** High
- **Preconditions:** Org is on the `starter` plan.
- **Steps:** Call `updateOrganizationBranding(orgId, {logo_url: "...", primary_color: "#123456", secondary_color: "#654321"})` for a Starter-tier org.
- **Expected Result:** The mutation either rejects the color fields (Starter = logo only per requirements §3.3) or silently ignores them while still saving the logo — whichever behavior is chosen must be explicit and tested; today's mock backend applies no gating at all, so this test defines the acceptance bar for closing that gap.

### TC-SET-API-006 — `updateProfile` password-change enforces the canonical validator server-side
- **Priority:** Critical
- **Steps:** Call the password-change mutation with `newPassword: "aaaaaaaa"` (no uppercase/digit) via whichever endpoint the Settings Account tab uses.
- **Expected Result:** Rejected — closes the real gap where `/settings`'s Account tab currently has no strength check at all (only `/profile`'s tab does), by making the backend the single source of truth regardless of which frontend tab is used.

### TC-SET-API-007 — `updateProfile` avatar upload is rejected server-side above the documented size limit
- **Priority:** Medium
- **Steps:** Attempt an avatar upload mutation with a file exceeding 2MB (Settings) / 5MB (Profile), matching whichever limit that endpoint documents.
- **Expected Result:** Rejected with a clear error — server-side enforcement is required since these are presentation-layer-only guards today (a request crafted outside the browser UI bypasses them entirely).

### TC-SET-API-008 — `revokeSession` actually invalidates the targeted session server-side
- **Priority:** Critical
- **Preconditions:** Settings' Account tab "Revoke" buttons were previously dead (`BUG-SET-003`, since fixed client-side); no backend exists yet to back them.
- **Steps:** Log in from two different sessions/devices. From session A, call `revokeSession(sessionB.id)`. Attempt an authenticated request from session B.
- **Expected Result:** Session B's subsequent request is rejected (401) — proves "Revoke" is a real server-side session invalidation, not merely a client-side list-item removal.

### TC-SET-API-009 — `deactivateAccount` requires re-authentication or a confirmation token
- **Priority:** High
- **Preconditions:** Settings' Deactivate Account flow currently only has a client-side confirm dialog with a `// BACKEND SWAP` placeholder comment — no real handler exists.
- **Steps:** Call the deactivate-account mutation without re-supplying the current password/an OTP.
- **Expected Result:** Rejected — a destructive account-level action should require step-up authentication, not merely a client-side "Are you sure?" dialog with no server-side confirmation step.

### TC-SET-API-010 — Notification preferences persist server-side, not only in local component state
- **Priority:** Medium
- **Preconditions:** `SUG-SET-009` (pending): notification preference toggles aren't persisted to any backend today.
- **Steps:** Call `updateNotificationPreferences(userId, {emailReminders: false})`, then fetch the user's preferences from a separate session/request.
- **Expected Result:** The `false` value is returned on the fresh fetch — proves persistence beyond the current session's component state.

### TC-SET-API-011 — Organization address accepts the India structured shape from the Clinic tab
- **Priority:** High
- **Steps:** Call `updateOrganization(orgId, {address: {line1, line2, city, state, pincode, country}})` from the Settings Clinic tab's save path.
- **Expected Result:** Accepted and round-trips correctly — ties the Settings page's Clinic tab into the same India-address contract mandated for Admin's Organizations CRUD (TC-ADMIN-API-011), since both surfaces edit the same underlying `ClientOrganizations` record.

### TC-SET-API-012 — Row-level scoping: `me`/`updateProfile` never accepts a client-supplied user id
- **Priority:** Critical
- **Steps:** Log in as User A, call `updateProfile(userId: UserB.id, {...})` (tampering with the argument).
- **Expected Result:** Rejected, or silently scoped back to User A regardless of the supplied id — mirrors TC-AUTH-API-005's guarantee that self-service profile mutations are never id-parameterized from an untrusted client value.

---

## 3. Functional / E2E Test Cases

*Full frontend + backend journeys, run via Playwright against a running backend (not mocks).*

### TC-SET-E2E-001 — Uploading a valid logo and saving colors propagates to the AppShell header/sidebar
- **Priority:** Critical
- **Preconditions:** Requirements doc §3.2 lists AppShell header/sidebar as the first propagation target, currently entirely unimplemented (`TopNav.jsx`/Sidebar still hardcode the `#006D77`/`#00858F`/`#0F9D58` gradient).
- **Steps:** As a manager (Pro or Enterprise plan), upload a valid square PNG logo and set distinct primary/secondary colors on Settings → Clinic → Branding. Save. Navigate to any other page in the app (e.g. `/manager/dashboard`).
- **Expected Result:** The AppShell header/sidebar now reflect the newly-saved primary/secondary colors and logo, replacing the hardcoded teal gradient — this test currently fails against the shipped frontend (no propagation exists) and is the acceptance bar for the requirements doc's core deliverable.

### TC-SET-E2E-002 — Branding propagates to outbound patient-facing emails
- **Priority:** High
- **Steps:** As a manager on a Pro-tier org, set a distinctive logo/color scheme, save. Have a patient book an appointment that triggers a confirmation email. Retrieve the email from a test sink.
- **Expected Result:** The email's header/branding elements use the organization's saved logo and primary color, not the platform default — closes requirements §3.2's email-propagation target.

### TC-SET-E2E-003 — Starter-tier organization cannot access color pickers, only logo upload
- **Priority:** High
- **Preconditions:** Org is on the Starter plan (per seed data, e.g. `org-3` "Wellspring Clinic").
- **Steps:** Log in as a manager of the Starter-tier org, navigate to Settings → Clinic → Branding.
- **Expected Result:** The logo uploader is present and functional; the primary/secondary color pickers are disabled or hidden with an upgrade prompt — this test currently FAILS against the shipped frontend (no gating exists at all today) and is the acceptance bar for implementing requirements §3.3.

### TC-SET-E2E-004 — A user with no organization sees a safe empty state on the Clinic/Branding tab, never another tenant's data
- **Priority:** Critical
- **Preconditions:** Directly targets the real cross-tenant fallback risk: `clinician@medibook.dev` (and other seeded accounts with `organisation: null`) currently fall back to `orgId: 'org-1'`.
- **Steps:** Log in as a user whose account has no associated organization, navigate to Settings → Clinic tab.
- **Expected Result:** The tab shows a "No organization associated with your account" empty/disabled state — it must NOT display or allow editing Meridian Health Group's (org-1) real logo/colors. This test currently FAILS against the shipped code and is the highest-priority fix in this entire domain.

### TC-SET-E2E-005 — Uploading an oversized or non-square logo is rejected with a clear inline error
- **Priority:** Medium
- **Steps:** Attempt to upload a 20MB PNG, then a 100×900px non-square PNG, to the Branding logo field.
- **Expected Result:** Both are rejected before the "Save Branding" button can be clicked, with an inline error explaining why (size / dimensions) — this test currently FAILS against the shipped frontend (`handleLogoSelect` has no validation of any kind) and is the acceptance bar for closing that gap.

### TC-SET-E2E-006 — Setting primary=secondary=white triggers a contrast warning before save
- **Priority:** High
- **Steps:** Set both primary and secondary color pickers to `#FFFFFF`, attempt to save.
- **Expected Result:** A contrast warning appears (client-side, ideally pre-empting the server-side rejection from TC-SET-API-002) explaining the colors won't be readable against white/black text — currently FAILS against the shipped frontend (no contrast check exists anywhere in the current UI).

### TC-SET-E2E-007 — Password-change flow behaves identically whether started from `/profile` or `/settings`
- **Priority:** Medium
- **Steps:** Attempt the same invalid password change (mismatch + too-short + no-uppercase, simultaneously) from `/profile`'s Password tab and from `/settings`'s Account tab.
- **Expected Result:** Both surfaces show the same validation error, in the same priority order — closes the real, confirmed inconsistency where the two pages currently check these conditions in different orders and Settings' Account tab skips the uppercase/digit check entirely.

### TC-SET-E2E-008 — Revoking a session from Settings actually logs out the other device
- **Priority:** High
- **Steps:** Log in on Device A and Device B as the same user. From Device A's Settings → Account → Sessions list, revoke Device B's session. Attempt any authenticated action on Device B.
- **Expected Result:** Device B is immediately logged out / its next request is rejected — proves the fixed client-side "Revoke" button (BUG-SET-003) is now backed by a real server-side session invalidation, not just a list-item removal.

### TC-SET-E2E-009 — Deactivating an account requires re-authentication and immediately ends the session
- **Priority:** High
- **Steps:** As a logged-in user, open Settings → Account → Deactivate Account, confirm.
- **Expected Result:** The flow requires the current password (or an OTP step) before proceeding; upon confirmation, the user is immediately logged out and a subsequent login attempt with the same credentials fails — replaces the current client-only confirm dialog's `// BACKEND SWAP` placeholder with a real, safe deactivation path.

### TC-SET-E2E-010 — Patient Profile insurance and allergy/condition fields save and reload correctly
- **Priority:** Medium
- **Steps:** As a patient, edit Insurance Provider/Policy/Expiry and add 2 allergies + 1 condition via the chip-add flow, save. Reload the page.
- **Expected Result:** All edited fields persist correctly after reload — proves the previously-fixed frontend gaps (dead "+ Add" chip handler, read-only insurance fields) are now backed by a real, persisting mutation rather than local component state.

### TC-SET-E2E-011 — Unsaved-changes guard prevents accidental navigation away from an edited Patient Profile
- **Priority:** Low
- **Preconditions:** `SUG-PTPROF-010` (implemented): `isDirty` diff + `beforeunload` listener.
- **Steps:** As a patient, start editing the profile form, then attempt to navigate away (in-app route change, not just a browser tab close) without saving.
- **Expected Result:** A confirmation prompt appears before the navigation is allowed to proceed — verifies the guard covers in-app SPA navigation, not only the browser-level `beforeunload` event (which a Playwright E2E test can exercise more thoroughly than a component-level test).

### TC-SET-E2E-012 — Date/time format is consistent between Settings-adjacent surfaces and the rest of the app
- **Priority:** Low
- **Steps:** If/when a "Last branding update" or similar timestamp is added anywhere in Settings, compare its rendered format against a known-correct instance elsewhere in the app (e.g. an appointment time on the Calendar).
- **Expected Result:** Both use `DD/MM/YYYY` dates and `h:mm A` times — no new raw-ISO or 24-hour leak is introduced into Settings as new timestamp-bearing features (like Branding) are added.

---

## 4. Frontend Test Cases

*Component/page-level, run against the existing mock store — these should pass (or, where noted, are current known gaps) today, independent of backend readiness.*

### TC-SET-FE-001 — Branding logo upload accepts an oversized file with no rejection
- **Priority:** Critical
- **Preconditions:** `frontend/src/pages/settings/index.jsx`'s `handleLogoSelect` (lines ~96-102) has no file-size guard — reads any selected file straight into a `FileReader` regardless of size, unlike the same file's own avatar-upload path (2MB guard) or `/profile`'s photo path (5MB guard).
- **Steps:** In mock mode, select a 50MB image file for the Branding logo field.
- **Expected Result (current behavior, should FAIL until fixed):** The file is read and previewed with no error — flag as the top gap for this net-new feature (see TC-SET-E2E-005 for the acceptance-bar version).

### TC-SET-FE-002 — Branding logo helper text promises constraints the code doesn't enforce
- **Priority:** High
- **Preconditions:** The helper caption under the logo upload button reads "SVG or PNG, square, at least 256×256px," but no code checks aspect ratio or minimum dimensions.
- **Steps:** Upload a 100×900px JPEG (non-square, undersized) via the Branding logo field.
- **Expected Result (current behavior):** Silently accepted and previewed despite visibly contradicting the UI's own stated requirement — a clear "the UI promises more than the code enforces" gap.

### TC-SET-FE-003 — Branding color TextFields accept non-hex free text
- **Priority:** High
- **Steps:** Type `"notacolor"` into the primary color TextField (paired with the native color-swatch input), then observe the "Save Branding" button's live gradient preview.
- **Expected Result (current behavior, should FAIL until fixed):** No validation error appears; the Save button's `linear-gradient(135deg, notacolor 0%, ...)` background silently fails to render as a gradient (falls back to browser default), which is itself a visible, reproducible symptom of the missing validation — a good concrete assertion point (inspect the computed `background` style, not just look for an error message).

### TC-SET-FE-004 — No WCAG contrast warning exists anywhere in the Branding UI
- **Priority:** High
- **Steps:** Set both primary and secondary colors to `#FFFFFF` and click "Save Branding".
- **Expected Result (current behavior, should FAIL until fixed):** The save proceeds with the generic "Branding saved successfully!" alert — no contrast check, no warning of any kind — despite this being an explicit requirement in `requirements/organization-branding-and-management-requirements.md` §3.4.

### TC-SET-FE-005 — No plan-tier gating exists anywhere in the Branding UI
- **Priority:** High
- **Preconditions:** Seed data's `org-3` ("Wellspring Clinic") is on the `starter` plan; `SUBSCRIPTION_PLANS.starter.features` lists no branding-related capability at all.
- **Steps:** Simulate a user belonging to `org-3`, navigate to Settings → Clinic → Branding.
- **Expected Result (current behavior, should FAIL until fixed):** Both color pickers are fully enabled and functional — no Starter/Pro/Enterprise distinction is applied anywhere in this component, contradicting requirements §3.3.

### TC-SET-FE-006 — Users with no organization silently edit org-1's real branding data
- **Priority:** Critical
- **Preconditions:** Grounded in the exact code: `const orgId = user?.organisation?.id ?? 'org-1'`; mock users `admin@medibook.dev`, `clinician@medibook.dev`, `receptionist@medibook.dev`, and `patient@medibook.dev` all have `organisation: null`.
- **Steps:** Log in as `clinician@medibook.dev` (mock mode), navigate to Settings → Clinic tab.
- **Expected Result (current behavior, should FAIL until fixed):** The Branding section shows/edits Meridian Health Group's (org-1) actual saved logo/colors, with no indication this clinician has no organization of their own — the single highest-priority frontend gap identified in this domain (see TC-SET-E2E-004 for the required fix).

### TC-SET-FE-007 — Save succeeds silently even when the org lookup fails
- **Priority:** Medium
- **Preconditions:** `updateOrganizationBranding(orgId, ...)` in the mock store returns `null` if no matching organization is found; `handleSaveBranding` never checks this return value before calling `handleSave('Branding')`.
- **Steps:** Call `handleSaveBranding` with an `orgId` that doesn't exist in the mock store's `organisations` array.
- **Expected Result (current behavior, should FAIL until fixed):** The "Branding saved successfully!" alert still appears even though nothing was persisted — the component needs to check the mutation's return value and show an error instead.

### TC-SET-FE-008 — Branding persists under a mock-only `org.branding` property, not `org.settings.branding`
- **Priority:** Low
- **Preconditions:** Both the requirements doc and `context/backend-implementation-plan.md` document persistence inside `ClientOrganizations.settings` (the existing `Json` column); the actual mock implementation instead invents `org.branding` as a new top-level property on the in-memory object.
- **Steps:** Inspect the mock store's in-memory organization object after calling `updateOrganizationBranding`.
- **Expected Result (current behavior, documented as a known mock-fidelity gap, not a bug to "fix" in mock mode):** Data lands at `org.branding`, not `org.settings.branding` — flag explicitly so a backend engineer doesn't copy the mock's shape literally (see TC-SET-API-001 for the real-backend requirement).

### TC-SET-FE-009 — No live AppShell/sidebar preview exists in the Branding section
- **Priority:** Medium
- **Preconditions:** Requirements doc §3.1 and `context/backend-implementation-plan.md` both describe a "live preview of the sidebar/header" as part of the Branding UI; no such preview element exists in the current `settings/index.jsx` JSX — only a static two-swatch color pair and the Save button's own gradient.
- **Steps:** Change the primary color in the Branding section, observe whether any part of the page besides the Save button itself updates live.
- **Expected Result (current behavior):** No sidebar/header mock preview updates — this documents a real, currently-missing piece of the intended UI, distinct from the separate (also-missing) real AppShell propagation covered by TC-SET-E2E-001.

### TC-SET-FE-010 — Password strength helper text doesn't mention the actual enforced rule
- **Priority:** Low
- **Preconditions:** `SUG-PROF-014` (pending): `/profile`'s password tab enforces uppercase+digit but its helper text doesn't say so.
- **Steps:** Focus the New Password field on `/profile`'s Password tab.
- **Expected Result (current behavior):** Helper text reads something generic about length only, not mentioning the uppercase/digit requirement that will actually block submission — a UX clarity gap, not a functional bug.

### TC-SET-FE-011 — Settings Clinic tab's non-branding fields are cosmetic-only (uncontrolled)
- **Priority:** Medium
- **Preconditions:** `SUG-SET-007` (pending): Clinic Name/Phone/Email/Timezone/Address/Currency/Slot Duration fields use `defaultValue` (uncontrolled inputs) and are never actually captured by the Save handler — in contrast to the Branding section added into the same tab, which IS fully controlled and functional.
- **Steps:** Edit the Clinic Name field, click the tab's Save button, reload the page.
- **Expected Result (current behavior):** The edited Clinic Name reverts to its original value on reload (never actually saved), while a Branding change made in the same save action correctly persists — a stark, testable contrast within one single tab worth calling out explicitly so it isn't mistaken for a Branding-specific bug.

### TC-SET-FE-012 — Settings avatar upload uses `alert()`, not an in-page Alert component
- **Priority:** Low
- **Preconditions:** `BUG-SET-001`'s fix uses a native `alert('File must be under 2 MB')` for the oversized-avatar case — a different, less consistent UX pattern than the rest of the page's MUI `Alert`/Snackbar components (including the Branding section's own save-success alert).
- **Steps:** Upload a 3MB image to the Settings avatar field.
- **Expected Result (current behavior, flag as a polish inconsistency):** A native browser `alert()` dialog appears rather than an in-page styled error — should be unified with the rest of the page's error-presentation pattern.

### TC-SET-FE-013 — Deactivate Account confirm dialog has no real backing action
- **Priority:** Medium
- **Preconditions:** `BUG-SET-004`'s fix added the confirmation dialog itself, but the confirm handler contains only a `// BACKEND SWAP` comment with no actual logic.
- **Steps:** Confirm account deactivation in mock mode.
- **Expected Result (current behavior):** The dialog closes with no visible error, but no actual state change occurs (the user remains logged in and active) — document this explicitly as "UI shell only, no mock-mode behavior implemented yet," distinct from features that have a working mock simulation.

### TC-SET-FE-014 — Font-size slider preview maps correctly to pixel values
- **Priority:** Low
- **Steps:** Move the Appearance tab's font-size slider through all 4 marks (SM/MD/LG/XL).
- **Expected Result:** Preview text renders at exactly 12px/14px/16px/18px respectively, per the `12 + fontSize*2` formula (`fontSize` 0-3) — confirms the exact mapping without off-by-one errors at the extremes.

### TC-SET-FE-015 — Notification preference toggles don't persist across reload
- **Priority:** Medium
- **Preconditions:** `SUG-SET-009` (pending): no backend persistence for notification preferences.
- **Steps:** Toggle off "Email Reminders" in the Notifications tab, reload the page.
- **Expected Result (current behavior, flag as a known gap):** The toggle reverts to its default (on) state after reload — confirms preferences live only in component state today, to be closed once TC-SET-API-010 is implemented.
