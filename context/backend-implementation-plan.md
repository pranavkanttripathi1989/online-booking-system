# MediBook/HealthSync — Backend Implementation Plan

**Stack:** Node.js + NestJS + Apollo GraphQL (code-first) + Prisma + PostgreSQL + Redis (BullMQ + Pub/Sub) + Docker
**Market:** India — this drives several decisions marked 🇮🇳 below.
**Grounded in:** `frontend-contract-analysis.md` (what the frontend actually expects), `schema.prisma` (619 lines / 30 models, already Postgres-targeted), `schema.ts` (1451-line Apollo typeDefs), `backend/graphql/schema.graphql` (515-line SDL — currently for the unused Laravel/Lighthouse scaffold).

Why this stack: see prior conversation — the existing `schema.prisma`/`schema.ts` represent the majority of backend domain design already done, for a Node+Prisma+Apollo stack, not Laravel. This plan reuses that work rather than re-deriving it in PHP.

**Current status:** Phases 1-3 complete and verified end-to-end (Docker + Postgres + Redis + the Auth module). **Phase 4 (Core catalog modules) is in progress** — Increment 1 (`Clinics`, `Rooms`, `ClinicianTypes`/`RoomTypes` lookups) and Increment 2 (`Organizations` admin CRUD) both done and live-verified against the running Docker stack (see `context/phase4-catalog-modules-implementation-plan.md` for full detail). Increment 1 hit and fixed the exact landmine flagged here previously — `@Roles()` alone doesn't work even paired with `@UseGuards(GqlAuthGuard)`, because NestJS runs global guards before handler-level ones regardless of decorator order; the real fix (global `GqlAuthGuard` + `@Public()` opt-out) is now in place and `context/backend-hard-rules.md` Rule 2 was corrected to match. **Still open in Phase 4**: `Products`+variants, `Languages`, `EmailTemplates` CRUD. Two real frontend integration gaps were found this phase: `manager/clinics/index.jsx` had zero backend wiring (now fixed); `manager/rooms/index.jsx` uses an incompatible GraphQL contract vs. the rest of the Rooms pages and needs an explicit decision before anyone touches it. Increment 2 also rebuilt `ClientOrganizations`' address as the proper India structured shape and updated `admin/Organizations.jsx` to match, since nothing else depended on its old Western shape.

---

## 🇮🇳 India-specific decisions (apply across phases below)

| Area | Decision | Why |
|---|---|---|
| Payments | **Razorpay as primary gateway**, keep Stripe integration path only if the client explicitly needs international cards | Razorpay supports UPI, netbanking, wallets, and India-specific compliance (RBI); it's the dominant gateway for Indian healthcare/booking SaaS. Frontend's `booking/index.jsx` currently hardcodes Stripe (`pk_test_placeholder`) — this needs to change to Razorpay Checkout/Elements. |
| OTP / SMS | Real SMS provider: **MSG91 or Gupshup** (cheaper, better India deliverability than Twilio) for the mobile-OTP login already stubbed in `login.jsx` | The OTP-first UX is already built and is the right call for India — it just needs a real backend (currently `MOCK_OTP='123456'`, pure simulation). |
| Currency | All monetary fields (`Products`, `PaymentTransactions`, `SubscriptionPlans`) default to **INR**, stored as integer paise (not float rupees) | Avoids float rounding bugs in billing; standard practice. |
| Invoicing | Add **GSTIN, HSN/SAC code, GST rate/amount breakup (CGST/SGST or IGST)** fields to `PaymentTransactions`/a new `Invoices` model | Required for any B2B/clinic-facing invoice in India; `finances`/`manager/Billing` pages currently mock plain `INVOICES` with no tax fields — this is a schema gap, not just a UI gap. |
| Address | Extend `address_structured` JSON shape to `{line1, line2, city, state, pincode, country}` (India uses state + 6-digit PIN, not `postalCode`) | Current Prisma comment shows a generic Western shape. |
| Data residency | Host Postgres + backend in **AWS ap-south-1 (Mumbai)** or an Indian cloud provider | India's DPDP Act 2023 treats health data as sensitive personal data; hosting in-region reduces compliance risk even though DPDP doesn't strictly mandate localization for all data. |
| Telemedicine compliance | `pages/video` (video consultation) must capture **clinician registration number + patient consent record** per India's Telemedicine Practice Guidelines 2020 (MoHFW/NMC) | Add `registration_number` to `Clinicians`, add a `consent_given_at` timestamp to `Appointments` or a dedicated `ConsentRecords` table before this feature ships. |
| Language | No change needed — `Languages`/`ClinicianLanguages` models already exist in `schema.prisma`, which fits India's multi-language reality well | Just needs seeding with the languages the client actually needs (Hindi + regional + English at minimum). |
| Email | **AWS SES**, region `ap-south-1`, alongside the S3 bucket already planned for uploads | One AWS account/region for both email and file storage keeps data residency simple; SES is inexpensive at this volume and has decent India deliverability. Use `nodemailer` with the SES transport so the provider can be swapped later without touching call sites. |

---

## Phase 0 — Reconcile the GraphQL contract (do this first, blocks everything else)

The frontend currently has **two inconsistent GraphQL sources** (central `graphql/{queries,mutations,subscriptions}.js` vs 25+ files with local colocated `gql` ops) and **two domains with zero schema at all** (Reviews, Messages — both purely `MockStore`-backed today).

- [ ] Diff every local `gql` operation against the central files; produce one canonical operation list (this doc's source agent already extracted the by-domain list in `frontend-contract-analysis.md §2` — use it as the checklist).
- [x] Inspect `mocks/data/messages.js` (`MESSAGE_THREADS`: id, participants[{id,name,role,avatar}], last_message, last_activity, unread_count, messages[{id,from_id,from_name,from_role,body,sent_at,read}]) and `mocks/data/analytics.js` `REVIEWS` (id, appointment_id, patient_id, patient_name, clinician_id, clinician_name, stars 1-5, comment, response|null, created_at) to ground the new models in what the UI already renders.
- [x] Extended `schema.prisma`: added `Reviews` (appointment/patient/clinician/clinic-scoped, `stars`, `comment`, `response`), `MessageThreads` + `MessageParticipants` (join table carrying per-user `unread_count`) + `Messages` — normalized relationally rather than mirroring the mock's inline `participants`/`messages` arrays, since threads need to be queried by participant. Also added GST fields + Razorpay IDs to `PaymentTransactions`, switched money fields to `Int` (paise) + `currency` default `INR`, updated `address_structured` to the India shape, and extended `TemplateType` for the email service (see Phase 9).
- [x] Switched remaining money fields (`ProductCancellationRules.fee_amount`, `ProductVariations.price`, `Products.price`, `SubscriptionPlans.price_monthly/yearly`) from `Float` to `Int` (paise) for consistency with `PaymentTransactions`.
- [ ] Decide: **code-first NestJS resolvers** (recommended — TypeScript types drive the schema, less drift) vs keeping `schema.ts`'s SDL as the source of truth. Recommendation: code-first, using `schema.ts` as the reference contract to satisfy, not as the literal file to keep maintaining by hand.

## Phase 1 — Project scaffold & infra ✅ Complete — see context/phase1-docker-auth-implementation-plan.md

- [ ] `nest new backend` (or restructure the existing empty `backend/` folder) — Nest CLI, TypeScript strict mode.
- [ ] `npx prisma init`, point `schema.prisma` datasource at Postgres, move it into `backend/prisma/schema.prisma`.
- [ ] Update `docker-compose.yml`:
  - `mysql` service → `postgres:16` (drop `mysql_data` volume, add `postgres_data`; drop the `--default-authentication-plugin` mysql-specific command)
  - `php-fpm` + `nginx` services → single `backend` Node service (`node:20-alpine`, `target: development`, runs `nest start --watch`)
  - `phpmyadmin` → `pgAdmin` (or drop in favor of a local Postgres GUI)
  - `horizon` → a `worker` service running the BullMQ processor, plus optionally `bull-board` for a Horizon-equivalent dashboard
  - Keep `redis` and `frontend` services as-is
- [ ] Root `.env` / `backend/.env`: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`, `RAZORPAY_KEY_ID/SECRET`, `MSG91_AUTH_KEY` (or Gupshup equivalent), `AWS_S3_BUCKET`/region for uploads.

## Phase 2 — Database & seed data ✅ Complete (RLS/least-privilege DB roles from the security addendum below still open — tracked there, not yet done)

- [ ] Run `prisma migrate dev` against the (now-extended) schema to generate the initial migration.
- [ ] Write a seed script (`prisma/seed.ts`) that mirrors `frontend/src/mocks/data/{seed,referenceData}.js` — clinician types, room types, languages, product categories/subcategories — so QA can log in with the **same 7 demo accounts** already hardcoded in `login.jsx`'s `MOCK_USERS`, now backed by real rows. This preserves every test plan already written under `test-plan/`/`test-result/` without rewriting them.
- [ ] Confirm multi-tenant scoping: every tenant-owned table filters through `client_org_id` → add a Prisma middleware or a repository-layer helper that injects the current JWT's org scope automatically, so no resolver can accidentally leak cross-tenant data.
- [ ] **Enable Postgres Row-Level Security (RLS) on every tenant-owned table**, with a policy keyed on `client_org_id` matched against a per-transaction session variable (`SET app.current_org_id`) — see `requirements/security-requirements.md` §9. This is a second, database-enforced isolation layer independent of the Prisma middleware above, not a duplicate of it — build both now, not RLS-later-if-there's-time.
- [ ] Provision least-privilege DB roles: an app role with only the DML it needs, a separate migration role for the deploy pipeline — never connect the running app as the Postgres superuser (`requirements/security-requirements.md` §9).

## Phase 3 — Auth module ✅ Complete and verified end-to-end (fully Dockerized, real browser test)

- [ ] `POST`-equivalent `login` mutation: bcrypt-verify password, issue JWT access token + refresh token. **Match the frontend's expected response shape exactly**: `{access_token, token_type, expires_in, user{...roles, clinician}}` (see `LOGIN` in `mutations.js`) — this is a hard contract, not a suggestion, since `AuthContext.jsx` destructures these exact fields.
- [ ] `me` query resolving from the JWT.
- [ ] `logout`: revoke refresh token (Redis-backed denylist or rotation), matching `apolloClient.clearStore()` on the frontend.
- [ ] RBAC guards: `Roles`/`Permissions`/`RolePermissions`/`UserRoles` already modeled in `schema.prisma` — build a NestJS `RolesGuard` + `@Roles()` decorator reading `user.roles[].name`, mirroring the frontend's `hasRole`/`RoleGuard`.
- [ ] **Row-level authorization** (not just route-level): patients must only ever be able to query/mutate their own `Patients`/`Appointments` rows; clinicians only their own patients/schedule. The frontend explicitly does **not** enforce this (see analysis §3/§8) — every resolver touching these domains needs an ownership check, not just a role check.
- [ ] OTP login 🇮🇳: real endpoint issuing + verifying OTP via MSG91/Gupshup, replacing the frontend's `MOCK_OTP` simulation. Rate-limit heavily (OTP endpoints are a common abuse target).
- [ ] Registration: implement the mutation `RegisterTab` currently has no call for at all.
- [ ] Forgot-password: real email/SMS-based reset flow replacing the simulated 60s cooldown.

## Phase 3.5 — Organization onboarding (SaaS tenant signup) — new, added after reviewing `test-suggestion/organization-onboarding-test-suggestion.md`

This product is a multi-tenant SaaS — nothing else works before a tenant (`ClientOrganizations`) exists, and today the only way one gets created is a platform-admin CRUD dialog with no owner user, no plan, and no trial. Schema already extended for this: `ClientOrganizations.owner_user_id`, `onboarding_status` (`OnboardingStatus` enum: `pending`/`in_progress`/`completed`), `onboarding_step`, `trial_ends_at`, `onboarded_at`.

- [ ] `OrganizationOnboardingModule` — a single **transactional** mutation-per-step (Prisma `$transaction`) backing the 4-step wizard proposed in the suggestion doc:
  1. `startOnboarding(orgDetails, ownerAccount)` → creates `ClientOrganizations` (`onboarding_status: in_progress`) + `Users`/`UserProfiles` (role `admin`) + sets `owner_user_id`, in one transaction.
  2. `selectPlan(orgId, planId)` → creates `OrganizationSubscriptions` (`status: trial`, `trial_ends_at: now()+14d`) — defer payment collection to trial end, don't block signup on it.
  3. `addFirstClinic(orgId, clinicDetails)` → creates the first `Clinics` row.
  4. `inviteTeam(orgId, emails[])` (optional/skippable) → sends `welcome`/invite emails via the Email Service (Phase 9).
  5. `completeOnboarding(orgId)` → sets `onboarding_status: completed`, `onboarded_at: now()`.
- [ ] Each step persists `onboarding_step` so an abandoned signup can resume rather than restart.
- [ ] **Trial expiry job** (BullMQ scheduled job): when `trial_ends_at` passes with no active paid subscription, transition `OrganizationSubscriptions.status → expired` and soft-lock the tenant (block new appointment creation, keep existing data readable) — don't hard-delete or lock out billing/admin screens.
- [ ] Keep the existing admin-CRUD `createOrganization` mutation (Phase 4) for platform-admin-created tenants (manual/sales-led onboarding) — it should default `onboarding_status: completed`, `owner_user_id: null`, same as today's behavior, so it isn't broken by this addition.

**Plan-based entitlements (feature gating)** — `SubscriptionPlans` already has `max_clinics`, `max_users`, and a `features Json` field, which is exactly what's needed; no schema change required, just enforcement:
- [ ] `EntitlementsGuard` — a NestJS guard/interceptor resolving the request's `client_org_id` → its active `OrganizationSubscriptions.plan`, then checking two things: (a) hard limits (`max_clinics`, `max_users` — reject `createClinic`/`inviteUser` mutations once the tenant is at its plan's cap, with a clear `userErrors` message pointing at upgrading) and (b) feature flags inside `features` (e.g. `messaging`, `sms_reminders`, `advanced_analytics`, `razorpay_payments` — gate the relevant resolvers/mutations behind `hasFeature(org, 'messaging')`).
- [ ] Frontend needs the same plan/features data surfaced via the `me`/dashboard query so it can show "Upgrade to Pro" prompts instead of just letting a mutation fail — add `organization { plan, features, max_clinics, max_users, clinicsUsed, usersUsed }` to whatever query loads on login.
- [ ] Decide per-feature: hard-block (mutation rejected) vs soft-gate (feature visible but disabled/upsell CTA) — hard-block for things with real cost (SMS via MSG91, Razorpay fees), soft-gate for pure software features (analytics depth, messaging) so users see what they're missing.

**Organization branding (white-labeling)** — `ClientOrganizations.settings Json` already exists and is the right home for this, no schema change needed:
- [ ] Store `{logo_url, primary_color, secondary_color}` inside `settings`. Logo upload reuses the same base64-over-GraphQL → S3 pattern as profile photos (Phase 12), just scoped to the org rather than a user.
- [ ] Validate `primary_color`/`secondary_color` server-side for WCAG AA contrast against white/black text before saving — rejecting an unreadable color pair at save time is much cheaper than a support ticket later.
- [ ] Surface org branding wherever the org's identity shows: `AppShell` header (replace the hardcoded HealthSync logo/teal `#006D77` with the tenant's), outbound emails (Phase 9's `EmailService` should inject `{logo_url, primary_color}` into every template), and PDF invoices/receipts (Phase 8).
- [ ] Gate customization depth by plan (ties into entitlements above): e.g. Starter = logo only, Pro+ = logo + full color scheme — a common SaaS upsell lever, and cheap to implement since it's just another `features` flag.
- [ ] Frontend follow-up: add a "Branding" section to org settings (admin-only) with a logo upload + two color pickers + a live preview of the sidebar/header — this doesn't exist in the current UI at all (`admin/Organizations.jsx` has no branding fields), and belongs on the onboarding wizard too (optional step, skippable, after "First clinic").

**Frontend follow-up required** (not backend work, flagging since it blocks this phase from being demoable): no self-serve signup UI exists yet — `pages/admin/Organizations.jsx` is admin-only CRUD, and `login.jsx`'s Register tab signs up a *patient*, not an *organization*. See `SUG-ONBOARD-001` through `006` in the suggestion doc for the proposed wizard UI and landing-page CTA.

## Phase 4 — Core catalog modules

Straightforward CRUD resolvers + DTOs (`class-validator`) + role guards for: `Organizations`, `Clinics`, `Rooms` + `RoomTypes`, `ClinicianTypes`, `Languages`, `Products`/`ProductCategories`/`ProductSubcategories`/`ProductVariations`, `ProductCancellationRules`, `EmailTemplates`. All already modeled in `schema.prisma`.

## Phase 5 — Clinicians & Availability (highest algorithmic complexity)

- [ ] `Clinicians` CRUD, `ClinicianAvailability` templates, `LunchBreaks`, `SpacerBlocks`, `RoomBlocks`.
- [ ] Build the `AVAILABLE_SLOTS(clinician_id, date, service_id)` resolver: merge availability templates, subtract lunch breaks / spacer blocks / room blocks / existing appointments, respect service duration + buffer time. **This is the core scheduling engine — get it under test before anything depends on it.**
- [ ] Add `registration_number` to `Clinicians` (🇮🇳 telemedicine compliance, Phase India-table above).

## Phase 6 — Patients module

- [ ] CRUD with the structured JSON fields already in `schema.prisma` (`place_of_birth`, `phones`, `address_structured` — update the address shape per the India table above).
- [ ] Enforce patient self-scoping (a patient's own `Patients` row must equal their JWT `user_id`).

## Phase 7 — Appointments module

- [ ] `CREATE/UPDATE/CANCEL/RESCHEDULE/COMPLETE_APPOINTMENT`, `MARK_NO_SHOW`, `AppointmentStatusLogs` audit trail on every transition.
- [ ] **Double-booking prevention**: a Postgres exclusion constraint or unique partial index on `(room_id or clinician_id, tstzrange(start,end))`, wrapped in a Prisma `$transaction`, not just an application-level check — this is exactly the kind of correctness guarantee that was the deciding factor for Postgres over Mongo earlier in this project.
- [ ] Enforce `ProductCancellationRules` server-side on cancel/reschedule (the frontend has no cancellation-policy logic at all).
- [ ] Paginated `APPOINTMENTS` query matching the `AppointmentFilters` shape already consumed by the frontend.

## Phase 8 — Billing & Payments 🇮🇳

- [ ] Integrate **Razorpay** (Node SDK) as primary gateway: create Order → frontend collects payment via Razorpay Checkout (replacing the current Stripe `CardElement` in `booking/index.jsx`) → verify payment signature server-side → persist `PaymentTransactions`.
- [ ] Add GST fields to the payment/invoice model (GSTIN, HSN/SAC, CGST/SGST/IGST breakup) per the India table.
- [ ] `SubscriptionPlans`/`OrganizationSubscriptions`/`StripeConfigurations` — these model the *clinic's* SaaS subscription to MediBook itself, separate from patient payments; decide whether this billing-of-tenants layer also moves to Razorpay Subscriptions or stays on Stripe (Stripe is more mature for recurring B2B SaaS billing — reasonable to keep Stripe here even while patient-facing payments use Razorpay).
- [ ] Razorpay webhook endpoint (raw-body REST route, not GraphQL, same as any Stripe-webhook pattern) for async payment confirmation.
- [ ] Replace the fully-mocked `finances`/`manager/Billing` pages' data source (`INVOICES`, `MONTHLY_REVENUE`, `REVENUE_BY_CLINICIAN`) with real aggregation queries.

## Phase 9 — Notifications & Email Service

- [ ] `Notifications` model already exists — implement create-on-event (appointment created/cancelled/rescheduled, payment received, review received → notification fan-out).
- [ ] `GetNotifications`/`MarkNotificationRead`/`MarkAllNotificationsRead`/`DeleteNotification` resolvers (currently local-only in the frontend, not in the central op files — fold into the canonical schema per Phase 0).
- [ ] Push new notifications via GraphQL Subscription (ties into Phase 10's transport).
- [ ] **Email Service** 🇮🇳 (`EmailModule`, shared across other modules — build this early, several other phases depend on it):
  - `EmailService.send(templateType, to, variables)` — renders the matching `EmailTemplates` row (subject + body, simple `{{variable}}` interpolation) and sends via `nodemailer` on the **AWS SES** transport (`ap-south-1`).
  - Extend `TemplateType` enum (done in `schema.prisma`) to cover: `confirmation`, `reschedule`, `cancellation` (already existed) + `welcome`, `password_reset`, `otp`, `invoice_receipt`, `review_request`.
  - Wire call sites: Auth module → `welcome` on registration, `password_reset` on forgot-password (Phase 3); Appointments module → `confirmation`/`reschedule`/`cancellation` on each transition (Phase 7); Billing module → `invoice_receipt` after a successful payment (Phase 8); optionally a scheduled job → `review_request` N hours after `COMPLETE_APPOINTMENT`.
  - Seed default templates for each `TemplateType` in `prisma/seed.ts` so the app is usable immediately without an admin manually authoring every template first (admin's existing `EmailTemplates` CRUD screen — `pages/admin/EmailTemplates.jsx` — lets these be edited afterward).
  - Queue sends through BullMQ (email job) rather than sending inline in the request/response cycle, so a slow SES call never blocks a GraphQL mutation response.

## Phase 10 — Real-time transport (currently missing on both ends)

- [ ] Server: add `graphql-ws` (NestJS `subscriptions: {'graphql-ws': true}` on the Apollo driver), backed by **Redis pub/sub** (`graphql-redis-subscriptions`) so it scales horizontally across worker instances (Redis is already in `docker-compose.yml`).
- [ ] Implement `appointmentUpdated(clinician_id)` and `calendarRefresh(clinic_id)` subscriptions matching `subscriptions.js`.
- [ ] **Frontend follow-up required**: `apollo/client.js` has no `wsLink`/`split()` at all — flag this to whoever owns frontend work next, since `calendar/index.jsx`'s existing `useSubscription` call is currently a no-op.

## Phase 11 — Reviews & Messages (net-new domains)

- [ ] After Phase 0's mock-shape inspection, add `Reviews` (patient_id, clinician_id, appointment_id, rating, comment, reply, status) and `Messages`/`MessageThreads` (participants, thread_id, body, read_at, attachments) to `schema.prisma`.
- [ ] Build resolvers; this is the one domain where there's no existing GraphQL contract to match — coordinate the exact field names with frontend before finalizing, since the mock store's shape isn't a binding contract, just today's best guess.

## Phase 12 — File uploads

- [ ] Match the frontend's existing base64-over-GraphQL contract (`UploadProfileImage(imageBase64, filename)`) rather than forcing a multipart rewrite — decode server-side, stream to S3-compatible storage (`@aws-sdk/client-s3`, bucket in `ap-south-1`).
- [ ] Flag as a future improvement (not blocking): move to presigned-URL direct uploads once file sizes grow beyond what's comfortable to push through a GraphQL mutation payload.

## Phase 13 — Analytics / Dashboard aggregation

- [ ] Per-role dashboard queries (`GetManagerDashboardData`, `GetClinicianDashboardData`, `GetPatientDashboardData`, `GetAdminData` + the shared `DASHBOARD` shape) via Prisma `groupBy`/raw SQL — `volume_by_day`, `bookings_by_service`, `utilisation_by_clinician`, `no_show_rate`. Postgres window functions are the reason this was recommended over MySQL/Mongo earlier.

## Phase 14 — Audit logging

- [ ] `AuditLogs` model already exists — add a NestJS interceptor that writes actor/action/entity/before-after diff on every mutation. Relevant given this is health data.

## Phase 15 — Security hardening

**See `requirements/security-requirements.md` for the full checklist — this is not a final cleanup pass.** Row-level authorization and tenant isolation in particular must be built alongside each domain's resolvers in Phases 4-14, not bolted on at the end.


- [ ] `class-validator` DTOs on every input.
- [ ] `@nestjs/throttler` rate limiting, especially on `login`/OTP endpoints.
- [ ] GraphQL query depth/complexity limits (`graphql-depth-limit`, query-complexity plugin) to prevent nested-query DoS.
- [ ] CORS locked to the deployed frontend origin, `helmet`, secrets via env (never committed).
- [ ] Re-verify row-level authorization (Phase 3) — this is the single biggest gap between what the frontend assumes and what it enforces.

## Phase 16 — Testing

- [ ] Contract tests against the exact operation list in `frontend-contract-analysis.md §2` — every op the frontend calls must resolve with the shape it expects.
- [ ] This repo already has extensive manual QA docs (`test-plan/`, `test-result/`, `test-suggestion/` — dozens of per-feature test plans with pass/fail history). Reuse these as acceptance criteria for e2e tests rather than writing test scope from scratch.

## Phase 17 — DevOps / deployment 🇮🇳

- [ ] Host in **AWS ap-south-1 (Mumbai)** or equivalent Indian region for both DB and app.
- [ ] `docker-compose.yml` changes from Phase 1 finalized; CI runs `prisma migrate deploy` on release.
- [ ] Health checks on the new `backend` service equivalent to the current `mysql`/`redis` healthchecks.

---

## Open questions / risks to resolve before or during Phase 0

1. **Two GraphQL schemas already exist** (`backend/graphql/schema.graphql` for the abandoned Laravel path, `schema.ts` for the Node path) — confirm with the team that the Laravel scaffold in `backend/` is being fully replaced, not kept as a parallel API.
2. **Reviews/Messages have zero real schema** — needs a short design pass with frontend before Phase 11, not just backend guessing field names from mock data.
3. **Stripe vs Razorpay split** (Phase 8) — confirm whether the client wants patient-facing payments *only* in Razorpay, or needs Stripe retained for any international-patient use case.
4. **GST invoicing** — confirm with the client whether MediBook needs to issue GST-compliant invoices itself (as the SaaS vendor to clinics) and/or whether individual clinics need GST invoices to patients — these are two different invoicing responsibilities.
5. **Apollo Client's 2-second fail-fast + silently-swallowed errors** (`frontend/src/apollo/client.js`) should be relaxed once a real backend exists, or every integration bug will look identical to "backend not running."
