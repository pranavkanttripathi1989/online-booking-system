# Organization Onboarding — Test Cases

**Domain covers:** self-serve tenant (`ClientOrganizations`) signup wizard, plan selection (`SubscriptionPlans`), trial lifecycle (`OrganizationSubscriptions`), plan-based entitlements/feature-gating, and organization branding (white-labeling).
**Grounded in:** `test-suggestion/organization-onboarding-test-suggestion.md` (written this session, no prior test-plan/test-result history exists for this domain), `requirements/organization-branding-and-management-requirements.md`, `context/frontend-contract-analysis.md §2/§4`, `context/backend-implementation-plan.md` Phase 3.5, `schema.prisma` (`ClientOrganizations`, `OrganizationSubscriptions`, `SubscriptionPlans`, `OnboardingStatus` enum).
**Status note:** this is the one domain in the suite where almost nothing is built yet. `admin/Organizations.jsx` is platform-admin CRUD only — there is no self-serve wizard, no plan/trial anywhere in the product, and `login.jsx`'s Register tab signs up a person, not an organization (`organization-onboarding-test-suggestion.md` §1–5). Branding is the one exception: it's already implemented against the mock store and Playwright-verified (`organization-branding-and-management-requirements.md §4`). Unit/API/E2E cases below are therefore mostly **forward-looking specs for the not-yet-built `OrganizationOnboardingModule`** (Phase 3.5), written against the schema fields and mutation shapes the suggestion doc and backend plan already committed to; Frontend cases document what exists today, including intentional current-state gaps.

---

## 1. Unit Test Cases

### TC-ONBOARD-UNIT-001 — Org code/slug uniqueness check rejects a duplicate `code`
- **Priority:** High
- **Preconditions:** A `ClientOrganizations` row already exists with `code: "citycare"`.
- **Steps:** Call the onboarding service's org-creation validator with `code: "citycare"` again.
- **Expected Result:** Rejected before any write — `ClientOrganizations.code` is `@unique` in `schema.prisma`; the validator must surface this as a friendly "This code is already taken" error, not a raw Postgres unique-constraint exception.

### TC-ONBOARD-UNIT-002 — Trial end date is computed as `now() + 14 days` on plan selection
- **Priority:** High
- **Steps:** Call `selectPlan(orgId, trialPlanId)` at a fixed mocked `now()`.
- **Expected Result:** The created `OrganizationSubscriptions.trial_ends_at` equals `now() + 14d` exactly (± 1s), matching `backend-implementation-plan.md` Phase 3.5 step 2.

### TC-ONBOARD-UNIT-003 — `onboarding_step` only accepts the defined resumable-step values
- **Priority:** Medium
- **Steps:** Attempt to set `onboarding_step` to `"org_details"`, `"plan_selected"`, `"first_clinic_added"`, `"team_invited"`, and then an arbitrary string `"bogus_step"`.
- **Expected Result:** The first four are accepted; `"bogus_step"` is rejected — this field drives wizard-resume logic (TC-ONBOARD-E2E-002), so an invalid value must not silently corrupt resume behavior.

### TC-ONBOARD-UNIT-004 — `EntitlementsGuard.hasFeature()` returns false for a feature absent from `features` JSON
- **Priority:** High
- **Preconditions:** A plan's `features` JSON is `{"messaging": true}`.
- **Steps:** Call `hasFeature(org, 'sms_reminders')`.
- **Expected Result:** Returns `false` — must not throw on a missing key, and must not default to `true`.

### TC-ONBOARD-UNIT-005 — Hard-limit check blocks clinic creation once `max_clinics` is reached
- **Priority:** Critical
- **Preconditions:** An org's active plan has `max_clinics: 1`; the org already has 1 `Clinics` row.
- **Steps:** Call the entitlements check for `createClinic`.
- **Expected Result:** Rejected with a `userErrors` message pointing at upgrading plan — matches `backend-implementation-plan.md` Phase 3.5's stated behavior ("reject `createClinic`/`inviteUser` mutations once the tenant is at its plan's cap").

### TC-ONBOARD-UNIT-006 — Hard-limit check blocks `inviteUser` once `max_users` is reached
- **Priority:** Critical
- **Steps:** Same as UNIT-005, scoped to `max_users` and a pending user invite instead of a clinic.
- **Expected Result:** Rejected with the same upgrade-pointing `userErrors` shape — verifies the guard is generic across both limit types, not hardcoded to clinics only.

### TC-ONBOARD-UNIT-007 — WCAG AA contrast validator rejects an unreadable color pair
- **Priority:** High
- **Steps:** Validate `primary_color: "#FFFF00"` (yellow) against white background text.
- **Expected Result:** Rejected — contrast ratio below the AA threshold (4.5:1 for normal text), per `organization-branding-and-management-requirements.md §3.4`'s stated server-side validation rule.

### TC-ONBOARD-UNIT-008 — WCAG AA contrast validator accepts a compliant pair
- **Priority:** Medium
- **Steps:** Validate `primary_color: "#006D77"` (the platform's own default teal) against white text.
- **Expected Result:** Accepted — the platform's own default must pass its own validator, otherwise the validator is miscalibrated.

### TC-ONBOARD-UNIT-009 — Admin-CRUD `createOrganization` defaults to a completed, ownerless org
- **Priority:** High
- **Steps:** Call the existing platform-admin `createOrganization` mutation's underlying service method (not the new onboarding wizard) with just `{name, code, contactEmail, address}`.
- **Expected Result:** Resulting row has `onboarding_status: completed`, `owner_user_id: null` — `backend-implementation-plan.md` Phase 3.5 explicitly requires this so the existing admin CRUD flow (`admin/Organizations.jsx`) isn't broken by the new wizard's addition.

### TC-ONBOARD-UNIT-010 — Trial-expiry job selects only orgs whose trial has actually lapsed
- **Priority:** Critical
- **Preconditions:** Org A: `status: trial`, `trial_ends_at` in the past. Org B: `status: trial`, `trial_ends_at` in the future. Org C: `status: active` (paid), `trial_ends_at` in the past (stale field, no longer relevant).
- **Steps:** Run the trial-expiry job's selection query.
- **Expected Result:** Only Org A is selected for transition to `expired` — Org B is untouched (not yet due), Org C is untouched (already converted to a paid plan, the stale `trial_ends_at` must not re-trigger expiry).

### TC-ONBOARD-UNIT-011 — Branding fan-out helper falls back to platform defaults when `settings.branding` is empty
- **Priority:** Medium
- **Steps:** Call the branding-resolution helper for an org whose `settings` JSON has no `branding` key at all.
- **Expected Result:** Returns the platform default `{logo_url: <HealthSync default>, primary_color: '#006D77', secondary_color: <default>}` — must not return `null`/`undefined` or throw, since this feeds the `AppShell` header on every page load.

### TC-ONBOARD-UNIT-012 — Plan-tier branding capability resolver matches the documented tier table
- **Priority:** Medium
- **Steps:** Call `getBrandingCapabilities(plan)` for `starter`, `pro`, and `enterprise` plans.
- **Expected Result:** `starter` → `{logo: true, colors: false, customDomain: false}`; `pro` → `{logo: true, colors: true, customDomain: false}`; `enterprise` → all `true` — matches the tier table in `organization-branding-and-management-requirements.md §3.3`.

---

## 2. Backend/API Test Cases

*Run against a real Postgres test database + the actual GraphQL schema, not mocks.*

### TC-ONBOARD-API-001 — `startOnboarding` creates org + owner user atomically; failure rolls back both
- **Priority:** Critical
- **Preconditions:** A `Users`/`UserProfiles` row already exists with the email the request will reuse as the intended owner.
- **Steps:** Call `startOnboarding(orgDetails, ownerAccount)` where `ownerAccount.email` collides with the existing user.
- **Expected Result:** The whole mutation fails (email-already-registered error); a subsequent count query confirms **no** `ClientOrganizations` row was created either — proves the `$transaction` wraps both writes, not just the user creation, per `backend-implementation-plan.md` Phase 3.5 step 1.

### TC-ONBOARD-API-002 — `startOnboarding` rejects a duplicate organization `code`
- **Priority:** High
- **Steps:** Call `startOnboarding` with a `code` matching an existing org.
- **Expected Result:** Rejected with a specific, actionable `userErrors` entry (not a generic 500), consistent with TC-ONBOARD-UNIT-001.

### TC-ONBOARD-API-003 — `selectPlan` creates a `trial` subscription with the correct period
- **Priority:** Critical
- **Preconditions:** Org exists with `onboarding_status: in_progress`.
- **Steps:** Call `selectPlan(orgId, planId)`.
- **Expected Result:** A new `OrganizationSubscriptions` row is created with `status: trial`, `trial_ends_at` 14 days out, `plan_id` set — no payment method is required to complete this call (per the suggestion doc's "defer payment collection to end-of-trial" recommendation).

### TC-ONBOARD-API-004 — `addFirstClinic` rejects being called before `startOnboarding`
- **Priority:** High
- **Steps:** Call `addFirstClinic(orgId, clinicDetails)` for an `orgId` that doesn't exist / whose `onboarding_status` is still `pending`.
- **Expected Result:** Rejected — enforces the wizard's step ordering server-side, not just via frontend step-gating (which doesn't exist yet).

### TC-ONBOARD-API-005 — `completeOnboarding` succeeds even when step 4 (team invite) was skipped
- **Priority:** High
- **Steps:** Complete steps 1–3, skip `inviteTeam` entirely, call `completeOnboarding(orgId)`.
- **Expected Result:** `onboarding_status` transitions to `completed`, `onboarded_at` is set — matches the suggestion doc's explicit "step 4 is skippable."

### TC-ONBOARD-API-006 — `inviteTeam` handles one invalid email in a batch without failing the rest
- **Priority:** Medium
- **Steps:** Call `inviteTeam(orgId, ["valid@example.com", "not-an-email", "also-valid@example.com"])`.
- **Expected Result:** The two valid addresses receive a `welcome`/invite email via the Email Service; the malformed one is reported back per-address in the response, not thrown as a fatal error that drops the valid sends too.

### TC-ONBOARD-API-007 — `EntitlementsGuard` blocks `createClinic` at the cap with an upgrade-pointing error
- **Priority:** Critical
- **Steps:** As TC-ONBOARD-UNIT-005, exercised through the actual GraphQL mutation.
- **Expected Result:** GraphQL response contains `userErrors` referencing the plan limit and an upgrade path; **no** `Clinics` row is written (verify via a follow-up count query, same pattern as `TC-AUTH-API-007`).

### TC-ONBOARD-API-008 — Existing admin `createOrganization` mutation is unaffected by Phase 3.5
- **Priority:** High
- **Steps:** Log in as `admin`, call the pre-existing `createOrganization` mutation exactly as `admin/Organizations.jsx` does today (`{name, code, contactEmail, address_line1, address_line2, city, postal_code, country, is_active}`).
- **Expected Result:** Succeeds unchanged, resulting row matches TC-ONBOARD-UNIT-009's defaults — regression guard that the new onboarding module doesn't require fields the existing admin dialog never collects.

### TC-ONBOARD-API-009 — An org's onboarding session cannot mutate another org's `onboarding_step`
- **Priority:** Critical
- **Preconditions:** Org A and Org B are both `in_progress`.
- **Steps:** Using Org A's owner session/token, call a step-mutation with Org B's `orgId` passed explicitly.
- **Expected Result:** Rejected — the acting org must be derived from the session, never trusted from a client-supplied `orgId` parameter, mirroring `TC-AUTH-API-010`'s cross-tenant isolation guarantee.

### TC-ONBOARD-API-010 — Trial-expiry job soft-locks a tenant without blocking reads
- **Priority:** Critical
- **Preconditions:** An org's `trial_ends_at` is in the past, no paid subscription exists.
- **Steps:** Run the scheduled job, then (a) attempt `createAppointment` for that org's clinic, (b) query existing `Appointments`/`Patients` for that org.
- **Expected Result:** (a) rejected with an "upgrade required" error; (b) succeeds normally, returning existing data — matches the explicit "soft-lock: block new appointment creation, keep existing data readable, don't hard-delete or lock out billing/admin screens" requirement in `backend-implementation-plan.md` Phase 3.5.

### TC-ONBOARD-API-011 — `updateOrganizationBranding` rejects an unreadable color pair server-side
- **Priority:** High
- **Steps:** Call the branding-update mutation with `primary_color: "#FFFF00"` on white.
- **Expected Result:** Rejected with a specific error identifying which color failed contrast — this is the backend enforcement of TC-ONBOARD-UNIT-007's rule; the branding requirements doc states this must happen "at save time," not just as a frontend nicety.

### TC-ONBOARD-API-012 — Session/dashboard query surfaces plan/entitlement data for the frontend's upgrade prompts
- **Priority:** High
- **Steps:** Log in as a user of an org on the `starter` plan, call the query that loads on login (`me`/dashboard-equivalent).
- **Expected Result:** Response includes `organization { plan, features, max_clinics, max_users, clinicsUsed, usersUsed }` exactly as specified in `backend-implementation-plan.md` Phase 3.5, so the frontend can show "Upgrade to Pro" instead of only surfacing a failed mutation.

---

## 3. Functional / E2E Test Cases

*Full frontend + backend journeys, run via Playwright against a running backend (not mocks). Several of these describe a wizard that does not exist in the frontend yet — see "Frontend follow-up required" in `backend-implementation-plan.md` Phase 3.5 — and should be treated as the acceptance bar for that follow-up work, not a regression suite for something already built.*

### TC-ONBOARD-E2E-001 — Full 4-step wizard happy path
- **Priority:** Critical
- **Steps:** Complete Org+Owner details → select the Trial plan → add a first clinic → skip team invite → land on the post-onboarding screen.
- **Expected Result:** Redirects to `/dashboard`; the org's `onboarding_status` is `completed`; the owner is logged in as that org's `admin`.

### TC-ONBOARD-E2E-002 — Abandoning and resuming the wizard restores the correct step
- **Priority:** High
- **Steps:** Complete step 1 only, close the browser, reopen and navigate back to the onboarding URL.
- **Expected Result:** The wizard resumes at step 2 (Plan selection) using the persisted `onboarding_step`, not restarted from step 1.

### TC-ONBOARD-E2E-003 — Newly onboarded owner can log in with the credentials set in step 1
- **Priority:** Critical
- **Steps:** Complete the wizard, log out, log in with the owner email/password entered during step 1.
- **Expected Result:** Login succeeds and lands on `/dashboard` as that org's admin — proves the atomic org+user creation in TC-ONBOARD-API-001 actually produces a usable login, not just a database row.

### TC-ONBOARD-E2E-004 — Trial expiry soft-locks new bookings but not existing data
- **Priority:** Critical
- **Steps:** Fast-forward an org past its `trial_ends_at` with no upgrade, then as that org's staff attempt to book a new appointment, then view an existing patient/appointment.
- **Expected Result:** New booking attempt shows an upgrade prompt (not a raw error); existing patients/appointments remain fully viewable — end-to-end expression of TC-ONBOARD-API-010.

### TC-ONBOARD-E2E-005 — Platform-admin-created org remains immediately usable without a wizard
- **Priority:** High
- **Steps:** Log in as a platform `admin`, create an org via the existing `admin/Organizations.jsx` dialog, then log in as a user manually associated with that org.
- **Expected Result:** The org is fully usable with no onboarding prompt shown anywhere — `onboarding_status: completed` from creation, per TC-ONBOARD-API-008's regression guarantee.

### TC-ONBOARD-E2E-006 — A Starter-plan tenant is blocked or upsold on a Pro-only feature
- **Priority:** High
- **Steps:** As a user of a `starter`-plan org, attempt to use a feature flagged `messaging` (soft-gated per the plan) and one flagged as a hard-cost feature like `sms_reminders`.
- **Expected Result:** Behaves per the documented hard-block-vs-soft-gate split in `backend-implementation-plan.md` Phase 3.5: the soft-gated feature is visible but disabled with an upsell CTA; the hard-cost feature's mutation is rejected outright.

### TC-ONBOARD-E2E-007 — Branding propagates to email and app header from a single save
- **Priority:** Medium
- **Steps:** Set a custom logo + primary color in Settings → Clinic → Branding, save, then (a) reload the app as any user of that org and inspect the header, (b) trigger a booking-confirmation email and inspect its rendering.
- **Expected Result:** Both surfaces reflect the new branding from the one save action — matches the "one upload, one save action, four surfaces updated" principle in `organization-branding-and-management-requirements.md §3.2`.

### TC-ONBOARD-E2E-008 — A landing-page "For Clinics" CTA routes to the org wizard, not patient signup
- **Priority:** Medium
- **Preconditions:** Grounded in SUG-ONBOARD-005 (pending) — this CTA does not exist yet; this test is the acceptance bar once it's built.
- **Steps:** From `landing.jsx`, click the new "For Clinics"/"Start free trial" CTA.
- **Expected Result:** Routes to the org onboarding wizard (TC-ONBOARD-E2E-001's entry point), not the patient-facing Register tab.

### TC-ONBOARD-E2E-009 — Register tab correctly forks patient signup vs. clinic signup
- **Priority:** Medium
- **Preconditions:** Grounded in SUG-ONBOARD-006 (pending).
- **Steps:** On `login.jsx`'s Register tab, choose "I'm a patient" vs. "I run a clinic."
- **Expected Result:** "I'm a patient" completes a normal person-level account registration; "I run a clinic" routes into the org onboarding wizard — the two flows must not be conflated into one generic form, per the suggestion doc's Finding #3.

---

## 4. Frontend Test Cases

*Component/page-level, run against the existing mock store. Several of these intentionally assert today's known gaps (documented in `organization-onboarding-test-suggestion.md`) rather than desired end-state behavior — marked accordingly so they aren't mistaken for bugs when read cold.*

### TC-ONBOARD-FE-001 — Admin org-create dialog collects no owner or plan fields (current gap)
- **Priority:** Medium
- **Preconditions:** Grounded in Finding #2 of `organization-onboarding-test-suggestion.md`.
- **Steps:** Open `admin/Organizations.jsx`'s create dialog and inspect the form fields.
- **Expected Result:** Only `{name, code, contactEmail, address_line1, address_line2, city, postal_code, country, is_active}` are present — no owner-user field, no plan selector. This documents today's state; it should be re-verified as *failing* (i.e., fields should now exist) once SUG-ONBOARD-002/003 land.

### TC-ONBOARD-FE-002 — Organizations list reads from a disconnected local mock, not the shared store (current gap)
- **Priority:** Medium
- **Preconditions:** Grounded in Finding #4.
- **Steps:** Compare the rows rendered in `admin/Organizations.jsx` against `store.organisations` (seeded from `mocks/data/seed.js`'s `ORGANISATIONS`).
- **Expected Result:** Today, the page's local `MOCK_ORGS` fallback (3 hardcoded rows, different field names) is shown, not `store.organisations` — this test should flip to asserting they match once SUG-ONBOARD-004 is implemented.

### TC-ONBOARD-FE-003 — Seeded organization rows carry onboarding lifecycle fields
- **Priority:** Medium
- **Preconditions:** Grounded in SUG-ONBOARD-004 (implemented per the suggestion doc's "What I changed already" note).
- **Steps:** Inspect `store.organisations` seed rows.
- **Expected Result:** Each row includes `onboarding_status`, `trial_ends_at`, `owner_user_id` fields alongside the pre-existing `{id, name, slug, plan, active_clinics, created_at}` shape.

### TC-ONBOARD-FE-004 — Branding logo upload updates the preview instantly, client-side
- **Priority:** Medium
- **Preconditions:** Grounded in `organization-branding-and-management-requirements.md §4` ("verified working end-to-end via Playwright").
- **Steps:** In Settings → Clinic → Branding, upload a logo image file.
- **Expected Result:** The live preview (sidebar/header mock-up) updates immediately without a network round trip — matches the profile-photo upload pattern (`FileReader`, base64) used elsewhere in the app.

### TC-ONBOARD-FE-005 — Both color pickers update the live preview without requiring Save
- **Priority:** Medium
- **Steps:** Change the primary color, then the secondary color, in the Branding section.
- **Expected Result:** The live sidebar/header preview reflects each change as it's made, before "Save" is clicked.

### TC-ONBOARD-FE-006 — Saved branding persists per-organization and survives reload
- **Priority:** High
- **Steps:** Set a logo + colors, click Save, reload the page.
- **Expected Result:** Values persist via `getOrganizationBranding`/`updateOrganizationBranding` in `MockStore`, scoped by `user.organisation.id` — a different mock user from a different organization must NOT see this org's branding.

### TC-ONBOARD-FE-007 — Branding lives under Settings → Clinic, not Settings → Appearance
- **Priority:** Medium
- **Preconditions:** Grounded in `organization-branding-and-management-requirements.md §3.1`'s explicit warning against conflating the two.
- **Steps:** Navigate to Settings → Appearance and confirm no organization-branding controls appear there; confirm they appear only under Settings → Clinic.
- **Expected Result:** Appearance tab contains only the individual user's personal theme (light/dark, font size, accent color for their own session) — no org-wide logo/color controls, guarding against a single staff member's personal dark-mode preference being mistaken for changing the clinic's brand.

### TC-ONBOARD-FE-008 — Register tab still doesn't call any mutation (current gap)
- **Priority:** Medium
- **Preconditions:** Grounded in `frontend-contract-analysis.md §3` — code comment reads "replace with real GraphQL mutation when backend ready."
- **Steps:** Submit the Register tab with valid data in mock mode.
- **Expected Result:** No mutation is fired; this documents today's no-op state and should be re-verified as *failing* once Phase 3.5/registration wiring lands.

### TC-ONBOARD-FE-009 — Landing page has no clinic-facing signup entry point (current gap)
- **Priority:** Low
- **Preconditions:** Grounded in Finding #5 / SUG-ONBOARD-005 (pending).
- **Steps:** Inspect `pages/public/landing.jsx` for any "For Clinics"/"List your practice"/"Start free trial" CTA.
- **Expected Result:** None exists today — entirely patient-facing (search doctors, book appointments). Should flip to asserting the CTA's presence once SUG-ONBOARD-005 ships.

### TC-ONBOARD-FE-010 — `plan` field on organizations is free text with no backing pricing model (current gap)
- **Priority:** Low
- **Steps:** Inspect a seeded organization's `plan` value (`'starter'|'pro'|'enterprise'`) and look for any linked `SubscriptionPlans`-shaped record.
- **Expected Result:** Today it's a bare string label with no pricing/feature-list backing — should flip once `mocks/data/plans.js` (SUG-ONBOARD-004) is actually wired into `Organizations.jsx`, not just added alongside it.

### TC-ONBOARD-FE-011 — `SUBSCRIPTION_PLANS` mock data matches the documented shape
- **Priority:** Medium
- **Steps:** Inspect `mocks/data/plans.js`.
- **Expected Result:** Contains `starter`/`pro`/`enterprise` entries, each with INR pricing in paise, `max_clinics`, and a `features[]` array — matches the shape described in `organization-onboarding-test-suggestion.md`'s "Mock data shape (implemented)" section.
