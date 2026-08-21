---
id: PLAN022
type: requirement
feature: organization-branding
created: 2026-08-21
updated: 2026-08-21
status: done
parent: REQ002
related: [TP051, TR050]
---

# Implementation plan — real backend + AppShell propagation for organization branding (REQ002)

## Scope decision vs. REQ002's original recommendation

REQ002 (written before any backend existed) suggested storing `{logo_url, primary_color, secondary_color}` in `ClientOrganizations.settings` (`Json`). Every other org-level feature built since then (booking policies, communication settings, security settings) instead uses typed, explicit columns on `ClientOrganizations`, following `org-settings.service.ts`'s established `toXSettings(row)`/`updateMyXSettings(input, user)` pattern. This plan follows that established convention instead — typed columns, not the `Json` blob — for consistency and so Prisma/GraphQL both get real typing instead of an untyped bag.

## What's real this pass vs. what stays logged, not guessed at

REQ002 §3.2 lists four propagation surfaces: app header/sidebar, booking-confirmation emails, invoices/receipts, favicon. Of these:

- **App header/sidebar: real this pass.** The one surface that exists today as a live, working UI.
- **Booking-confirmation emails: not built.** No real email-sending pipeline exists yet — `notification-trigger.service.ts`'s email path is an explicitly logged stub (no AWS SES credentials in this environment, per `REQ008`). Branding can't propagate into an email that isn't actually sent.
- **Invoices/receipts: not built.** No backend invoice/PDF-generation module exists — `finances/index.jsx`'s "receipt drawer" is a client-side UI construct over `AppointmentPayments` rows, not a generated document with a branding slot.
- **Favicon: not built.** Would need a build-time or per-request dynamic favicon swap; out of scope for a per-tenant SPA without meaningfully more infrastructure (a static `index.html` favicon can't vary per logged-in org).

REQ002 §3.3 (plan-tier gating: Starter/Pro/Enterprise) and §3.4's onboarding nudge are also not built: no `SubscriptionPlans.features`/`EntitlementsGuard` infrastructure exists anywhere in this codebase, and no scheduled-job infrastructure exists to drive a "N days after onboarding" nudge (the same gap `REQ008`'s `appointment_reminder` hit). Both logged here, not silently dropped.

**What ships real and tested:** logo upload (server-validated), primary/secondary color pickers with real server-side WCAG AA contrast validation (REQ002 §3.4), persisted per-org, propagated to the app sidebar and top-nav header for every logged-in user whose JWT carries a `client_org_id` (manager/clinician/staff/patient) — replacing the hardcoded "HealthSync" wordmark/teal icon tile for those views. Platform-wide callers (admin/super_admin, `client_org_id: null`) keep the default HealthSync branding, since they aren't viewing any one tenant's storefront.

## Schema

Three new columns on `ClientOrganizations`:

```
logo_url       String?
primary_color  String  @default("#006D77")
secondary_color String @default("#00858F")
```

Defaults match the platform's own existing teal (`AppShell.jsx`'s `TEAL`/`TEAL_LIGHT` constants) — an org that never sets branding renders identically to today, not a jarring default.

## `backend/src/org-settings/` extension

Same pattern as booking-policies/communication-settings/security-settings: `OrgBrandingType`/`UpdateOrgBrandingInput`, `myOrgBranding`/`updateMyOrgBranding`, `@Auth('manager','admin','super_admin')`, `{success, userErrors, branding}` response.

**WCAG AA contrast validation** (REQ002 §3.4, real this pass): a pure `contrastRatio(hex1, hex2)` helper (relative-luminance formula, no new dependency) checks each of `primary_color`/`secondary_color` against white (`#FFFFFF`) — both colors are used as a background behind white text/icons throughout the branded chrome. A ratio below 4.5:1 (WCAG AA, normal text) is rejected with a clear `userErrors` message naming which color failed and its actual ratio, not a generic "invalid color."

## `backend/src/organizations/` (or a new small controller) — logo upload

New REST endpoint mirroring `account.controller.ts`'s avatar-upload pattern exactly: `FileInterceptor`, manual JWT verification (`GqlAuthGuard` doesn't cover REST routes), magic-byte validation (PNG/JPEG only — SVG deliberately excluded this pass, see below), 2MB limit, local filesystem storage under `backend/uploads/branding/` (no AWS credentials in this environment, same documented swap-path comment as avatar upload). Requires the caller's `client_org_id` to be non-null (manager/admin/super_admin only, org-less callers rejected) — a role check the avatar endpoint doesn't need (any authenticated user uploads their own avatar; only a manager should be able to set their org's public logo).

**SVG deliberately excluded, not silently forgotten:** the requirement doc's placeholder copy says "SVG or PNG." SVG is XML that can embed `<script>`/event-handler payloads — serving a user-uploaded SVG back to other users (including patients, who see this logo on the booking page) without a real sanitization pass would be a stored-XSS vector. No SVG-sanitization library exists in this environment. This pass accepts PNG/JPEG only (matching `account.controller.ts`'s own existing restriction exactly) and the frontend's helper copy is corrected to say so. SVG support is a real, separate follow-up requiring a sanitizer dependency, not a "just accept it" shortcut.

## `frontend/src/pages/settings/index.jsx` — rewire the existing Branding section

Replace `useMockData(store.getOrganizationBranding)`/`useMockMutation(store.updateOrganizationBranding)` with the real `GET_ORG_BRANDING`/`UPDATE_ORG_BRANDING` operations. Logo upload posts to the new REST endpoint (same `fetch` + bearer-token pattern `account.jsx`'s avatar upload already uses), then saves the returned URL via the branding mutation. A contrast-validation error surfaces as a real `Alert`, not a silent no-op. Update the "SVG or PNG" helper text to "PNG or JPEG" to match the real accepted types.

## `frontend/src/layouts/AppShell.jsx` — propagation

A `useQuery(GET_MY_ORG_BRANDING)` call (no `skip` condition needed — the resolver itself returns `null` for an org-less caller, same convention as every other `org-settings` query, so the frontend doesn't need to pre-guess who has an org). Both brand-header blocks (sidebar variant, top-nav variant) render the org's `logo_url` (an `<img>`, replacing the `LocalHospitalIcon` tile) and org name (replacing the literal "HealthSync" text) when branding data resolves with a non-null `logo_url`; otherwise render exactly what's there today. `primary_color`/`secondary_color` are fetched and available but **not** wired into the sidebar's `TEAL`/`TEAL_LIGHT` gradient this pass — those constants are hardcoded as bare hex strings in ~40 places across this 2400-line file (and more elsewhere in the app), and retheming the whole app dynamically per-org is a substantial, separate refactor (auditing/replacing every hardcoded color reference sitewide) out of proportion to this slice; logged here rather than silently attempted halfway. Logo + org name is the concrete, achievable "propagate the brand identity" surface for this pass.

## Testing

`org-settings.service.spec.ts` (extended): org-scoping, platform-wide-caller rejection for both query and mutation, contrast-validation rejects a too-light color with the correct failing-color message, accepts a color that passes, defaults apply when nothing has been set yet.
`contrast.spec.ts` (new, pure function): known WCAG-reference color pairs produce the textbook-documented ratios (e.g. black-on-white ≈ 21:1, white-on-white = 1:1).
A new controller spec (mirroring `account.controller.spec.ts`'s pattern if one exists, or added inline) for the logo-upload endpoint: rejects a non-image file by magic bytes even with a spoofed `Content-Type`, rejects >2MB, rejects an org-less caller, accepts a valid PNG/JPEG and returns a URL, persists a resolvable file.

## Verification

Full backend `npm test` green. Live curl verification: upload a real PNG, save branding with a passing color, confirm `myOrgBranding` returns it; attempt a save with a too-light color, confirm the contrast rejection message; confirm an org-less (admin) caller gets a clear rejection from both endpoints. Live Playwright verification: Settings → Clinic → Branding shows the real upload/save flow; AppShell's sidebar and top-nav both show the uploaded logo + org name for a manager/patient account, and the unbranded default for admin. Playwright e2e spec. Responsive check at 360/768/1280px. Commit.
