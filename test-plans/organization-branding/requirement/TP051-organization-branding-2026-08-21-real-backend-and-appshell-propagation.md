---
id: TP051
type: requirement
feature: organization-branding
created: 2026-08-21
updated: 2026-08-21
status: approved
parent: REQ002
related: [PLAN022]
---

# Test plan — real backend + AppShell propagation for organization branding (REQ002/PLAN022)

## Unit tests

`backend/src/common/utils/contrast.spec.ts` (new, pure function): black-on-white is the textbook ~21:1 maximum; white-on-white is 1:1 (no contrast); the ratio is symmetric regardless of argument order; the platform's own default teal (`#006D77`) passes WCAG AA against white; a pale yellow (`#FFFF00`) fails WCAG AA against white.

`backend/src/org-settings/org-settings.service.spec.ts` (extended, `myBranding`/`updateMyBranding` describe block): returns `null` for a platform-wide (org-less) caller without ever querying the database; scopes strictly to the caller's own org id and applies the platform-default colors when nothing has been set; rejects an update from a platform-wide caller with a clear "linked to an organization" message and performs no write; a color that passes contrast updates only the caller's own org row; a `primary_color` too light to keep white text readable is rejected with a message naming the failing color, without writing; a too-light `secondary_color` is rejected independently of `primary_color`; an explicit `logo_url: null` clears the logo; omitting `logo_url` leaves it untouched.

No dedicated `org-branding.controller.spec.ts` was written — `account.controller.ts`, the endpoint this REST upload mirrors, itself has no controller-level spec in this codebase (only its service layer is unit-tested), so this follows the same established precedent rather than introducing a new one for this endpoint alone. The upload endpoint's magic-byte validation, 2MB limit, and org-linked-only gate are covered by live curl verification below instead.

## Live e2e verification (real backend, curl)

1. Upload a real PNG via `POST /org-branding/logo` as a manager, confirm the response URL resolves to a real file under `backend/uploads/branding/`.
2. Save branding with a passing `primary_color`/`secondary_color`, confirm `myOrgBranding` returns the saved values.
3. Attempt a save with a too-light color, confirm the contrast-rejection message names the specific color and its ratio, and that the org's stored branding is unchanged.
4. Confirm an org-less (admin) caller gets a clear rejection from both `updateMyOrgBranding` and the logo-upload endpoint, rather than a 500 or a silently-accepted no-op.
5. Confirm the platform's own previous default `secondary_color` (`#00858F`) fails contrast validation by a hair, motivating the follow-up migration that changed the column default to `#007680`.

## Browser e2e (Playwright)

`frontend/e2e/organization-branding.spec.js` (new, serial — every test in the file reads and overwrites the same shared org's branding row, same reasoning as `security-privacy.spec.js`):
1. Manager uploads a real logo via the file input, saves colors, confirms the success message, reloads, confirms the logo persists as a real `<img src="/uploads/branding/...">` in both the Settings preview and `AppShell`'s sidebar, and confirms the org's real name (not "HealthSync") renders in the sidebar.
2. A too-light color is rejected with a clear message and the page never claims success.
3. An admin (no organization) sees the disabled-branding notice on the Settings page and the default HealthSync shell in `AppShell` — proving platform-wide callers are unaffected by any tenant's branding.

## Responsive check

360px/768px/1280px, live Playwright: Settings → Clinic → Branding section (logo upload, two color pickers, live preview) and both `AppShell` variants (sidebar, top-nav) showing the propagated logo/name — zero horizontal overflow at any breakpoint.

## Explicitly out of scope this pass (logged in PLAN022, not silently dropped)

Booking-confirmation email branding, invoice/receipt branding, favicon swap, and plan-tier gating (Starter/Pro/Enterprise) all require infrastructure (a live email pipeline, an invoice/PDF module, per-request dynamic favicons, an entitlements guard) that doesn't exist yet in this codebase — none of these are tested here because none are built here. `primary_color`/`secondary_color` are fetched and available on `AppShell`'s branding query but not yet wired into the sidebar's hardcoded `TEAL`/`TEAL_LIGHT` gradient constants (a much larger, separate retheming pass) — not tested here for the same reason.
