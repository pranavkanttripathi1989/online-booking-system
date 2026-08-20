---
id: TS025
type: test-suggestion
feature: organization-onboarding
created: 2026-08-17
updated: 2026-08-17
status: in-progress
parent: unknown
related: []
---

# Organization Onboarding — Feature Suggestions

**Module:** `frontend/src/pages/admin/Organizations.jsx`, `frontend/src/pages/auth/login.jsx` (Register tab), `schema.prisma` (`ClientOrganizations`, `OrganizationSubscriptions`, `SubscriptionPlans`)
**Context:** MediBook/HealthSync is being built as a multi-tenant **SaaS** product for the Indian market — each clinic/practice is a tenant (`ClientOrganizations`). This doc audits how a new tenant actually gets onto the platform today, since that's the entry point of the whole business and was not covered by the existing per-page test-suggestion docs.
**Last Updated:** 2026-08-17

> ⚠️ **No self-serve organization onboarding exists anywhere in the product today.** Organizations can only be created by a platform admin, one at a time, via a plain CRUD dialog with no owner user, no plan, and no trial. This is the single biggest gap between "what's built" and "what a SaaS needs."

---

## Findings

### 1. `admin/Organizations.jsx` is tenant *management*, not tenant *onboarding*
The only place `ClientOrganizations` rows are created is a simple modal (name, code, contact email, address) reachable only by an already-logged-in platform admin (`RoleGuard` on `/admin/*` → `['admin','super_admin']`). There is no path for a prospective clinic to sign themselves up. This is a legitimate model for a sales-led/manually-onboarded early SaaS, but it means:
- Every new customer requires a human at MediBook to manually create their org before they can log in at all.
- Nothing in the product demonstrates the self-serve funnel a SaaS pricing page usually promises (start free trial → get a login → start booking).

### 2. Organization creation has no owner and no plan
`CREATE_ORG` in `Organizations.jsx` only submits `{name, code, contactEmail, address_line1, address_line2, city, postal_code, country, is_active}`. It doesn't:
- Create or link any `Users` row as the org's owner/first admin — an admin has to separately go create a user in `admin/users` and manually associate it, if that association is even modeled (it currently isn't, beyond `UserProfiles.clinic_id`, which is clinic-scoped, not org-scoped).
- Touch `OrganizationSubscriptions`/`SubscriptionPlans` at all — despite `SubscriptionStatus` already including a `trial` value in the schema, nothing in the frontend ever creates a subscription, trial or otherwise.

### 3. `login.jsx`'s "Register" tab registers a *person*, not an *organization*
The Register tab (patient-style signup) never calls a mutation at all (comment: "replace with real GraphQL mutation when backend ready") and has no concept of "I'm signing my clinic up" vs "I'm a patient creating an account." These are two fundamentally different signup flows in a B2B2C product like this one and are currently conflated into a single generic form.

### 4. Org mock data exists but is disconnected, and has no real plan/pricing model
`mocks/data/seed.js` already has `ORGANISATIONS` (`{id, name, slug, plan: 'starter'|'pro'|'enterprise', active_clinics, created_at}`), loaded into the shared `MockStore` as `store.organisations`. But `admin/Organizations.jsx` **doesn't use it** — it keeps its own disconnected local `MOCK_ORGS` fallback (3 different hardcoded rows, different field names). And `plan` is just a free-text label with no backing `SUBSCRIPTION_PLANS` record — no pricing, no feature list, no trial state anywhere.

### 5. Landing page has no B2B entry point
`pages/public/landing.jsx` is entirely patient-facing (search doctors, book appointments). There's no "For Clinics" / "List your practice" / "Start free trial" CTA anywhere — which matters if the go-to-market plan for the Indian client relies on any self-serve or marketing-driven signup rather than 100% manual sales onboarding.

### 6. Schema gap (now fixed, see below)
`ClientOrganizations` had no lifecycle state beyond a plain `is_active` boolean — no way to represent "signed up but hasn't finished setup," no `trial_ends_at`, and no link to who owns the tenant.

---

## What I changed already (schema-level, `schema.prisma`)

| Change | Field(s) |
|---|---|
| Added onboarding lifecycle | `ClientOrganizations.onboarding_status` (`pending`/`in_progress`/`completed` — new `OnboardingStatus` enum), `onboarding_step` (resumable wizard position), `trial_ends_at`, `onboarded_at` |
| Added tenant ownership | `ClientOrganizations.owner_user_id` → `Users` (relation `OrganizationOwner`) |

These are additive and don't break the existing admin CRUD flow — an admin-created org just defaults to `onboarding_status: completed` with no owner, same as today's behavior.

---

## Suggestions

| ID | Suggestion | Priority | Status |
|----|-----------|----------|--------|
| SUG-ONBOARD-001 | Build a self-serve "Create your organization" signup wizard, separate from the admin CRUD dialog | 🔴 High | ⏳ PENDING |
| SUG-ONBOARD-002 | Wizard step 2: plan selection (trial vs paid), backed by real `SubscriptionPlans` mock data | 🔴 High | ⏳ PENDING |
| SUG-ONBOARD-003 | Tie org creation to owner-user creation atomically (one submit → org + first admin user + first clinic) | 🔴 High | ⏳ PENDING |
| SUG-ONBOARD-004 | Add `mocks/data/organizations.js` + `mocks/data/plans.js`, wired into the shared `MockStore`, replacing `Organizations.jsx`'s disconnected local `MOCK_ORGS` | 🟡 Medium | ⏳ PENDING |
| SUG-ONBOARD-005 | Add a "For Clinics" CTA on the landing page linking to the new signup wizard | 🟡 Medium | ⏳ PENDING |
| SUG-ONBOARD-006 | Split `login.jsx`'s "Register" tab: patient self-registration vs. "I run a clinic" (routes to the org wizard) | 🟡 Medium | ⏳ PENDING |
| SUG-ONBOARD-007 | Admin `Organizations.jsx` list: surface `onboarding_status` and `trial_ends_at` as columns/chips so ops can see stuck signups | 🟢 Low | ⏳ PENDING |
| SUG-ONBOARD-008 | Backend: on trial expiry (`trial_ends_at` passed, no paid plan), auto-transition `OrganizationSubscriptions.status` to `expired` and soft-lock the tenant (block new appointments, keep read access) | 🟡 Medium | ⏳ PENDING (backend, see `context/backend-implementation-plan.md`) |

### SUG-ONBOARD-001/002/003 — Wizard shape (recommendation)

A 4-step flow, each step persisted via `onboarding_step` so a refresh/abandon-and-return doesn't lose progress:

1. **Organization + owner account** — org name, code/slug, contact email/phone, owner's name + password. Creates `ClientOrganizations` (`onboarding_status: in_progress`) + `Users`/`UserProfiles` (role: `admin`, scoped to that org) + sets `owner_user_id`.
2. **Plan selection** — show `SubscriptionPlans` (monthly/yearly INR pricing, feature list from the existing `features Json` field), default to a 14-day trial (`OrganizationSubscriptions.status = trial`, `trial_ends_at = now()+14d`). Payment method collection can be deferred to end-of-trial rather than blocking signup — reduces signup friction, common SaaS pattern.
3. **First clinic** — name, address (India format: line1/line2/city/state/pincode), phone. Creates the first `Clinics` row under the new org so the owner isn't dropped into an empty dashboard.
4. **Invite team (optional, skippable)** — email invites for clinicians/staff, using the same `EmailTemplates`/email service being built in the backend plan (`welcome`/`invite` template).

On completing step 3 (step 4 is skippable), set `onboarding_status: completed`, `onboarded_at: now()`, redirect to `/dashboard`.

### SUG-ONBOARD-004 — Mock data shape (implemented)

Added `mocks/data/plans.js` (`SUBSCRIPTION_PLANS`: starter/pro/enterprise, INR pricing in paise, `max_clinics`, `features[]`) and extended `store.organisations` entries with `onboarding_status`, `trial_ends_at`, `owner_user_id` so the existing `ORGANISATIONS` seed rows carry onboarding state instead of introducing a second parallel org list.

---

## Backend implication

This whole flow needs a dedicated `OrganizationOnboardingModule` on the backend (transactional: org + owner user + trial subscription must all succeed or all roll back). This has been added as **Phase 3.5** in `context/backend-implementation-plan.md`, sitting between Auth (Phase 3) and the core catalog modules (Phase 4), since nothing else in a multi-tenant system works before a tenant exists.
