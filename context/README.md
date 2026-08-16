# Context — MediBook/HealthSync

Index of everything captured during backend-architecture planning. Read `frontend-contract-analysis.md` first if you're new to this — everything else is derived from it.

## Files in this folder

| File | What it is |
|---|---|
| `frontend-contract-analysis.md` | Ground truth: every route, every GraphQL operation the frontend expects (by domain), auth flow, the fact the app runs 100% on mock data today, real-time/upload/payment integration points, role enforcement gaps. |
| `backend-implementation-plan.md` | 17-phase step-by-step backend build plan (Node + NestJS + Apollo GraphQL + Prisma + PostgreSQL + Redis), grounded in the contract analysis. Includes India-specific decisions (Razorpay, MSG91/Gupshup OTP, AWS SES `ap-south-1`, GST invoicing, INR), Phase 3.5 (SaaS organization onboarding), plan-based entitlements, and organization branding/white-labeling. |
| `frontend-suggestions-implementation-log.md` | Tracks the wave of `test-suggestion/` fixes being implemented across 5 parallel background agents (🔴/🟡 priority items only, 🟢 deferred). |
| `test-cases-writing-log.md` | Tracks the 4 parallel background agents writing the formal test-case suite at `/test-cases` (14 feature domains × Unit/Backend-API/Functional-E2E/Frontend sections), written before backend development starts. |

## Other top-level folders this project now has

- **`/requirements`** — business/product requirements docs: `organization-branding-and-management-requirements.md` (competitive-benchmarked branding/plan-tier recommendation), `security-requirements.md` (OWASP-grounded checklist every backend phase must satisfy — row-level tenant isolation is the single highest-risk gap identified so far, since the frontend enforces none of it).
- **`/test-cases`** — the formal pre-backend test-case suite (see `test-cases/README.md`), distinct from the pre-existing `/test-plan`, `/test-result`, `/test-suggestion` (manual QA history) — this new suite is derived from and cites that QA history, plus `frontend-contract-analysis.md` and `schema.prisma`, as its grounding.

## Decisions made so far

- **Stack:** Node.js + NestJS + Apollo GraphQL (code-first) + Prisma + PostgreSQL + Redis (BullMQ + Pub/Sub), replacing the empty/unused Laravel scaffold in `backend/`.
- **Market:** India — Razorpay (patient payments), Stripe kept only for tenant SaaS-subscription billing, MSG91/Gupshup (OTP SMS), AWS SES `ap-south-1` (email), AWS `ap-south-1` hosting, GST fields on `PaymentTransactions`, INR stored as paise, Indian address format (state + PIN code).
- **`schema.prisma` extended** (root of repo, not yet moved into `backend/`): added `Reviews`, `MessageThreads`/`MessageParticipants`/`Messages` (previously undefined domains), GST + Razorpay fields on `PaymentTransactions`, all money fields switched `Float→Int` (paise), `OnboardingStatus` enum + `owner_user_id`/`onboarding_status`/`onboarding_step`/`trial_ends_at`/`onboarded_at` on `ClientOrganizations` for self-serve SaaS signup, extended `TemplateType` for the email service. Validated with `prisma validate` — schema is syntactically and relationally correct.
- **Organization onboarding wizard built** — `frontend/src/pages/onboarding/index.jsx` (4-step: org+owner → plan → first clinic → done), route `/get-started`, linked from the landing nav ("For Clinics"). Backed by real mock-store mutations (`startOrganizationOnboarding`, `selectOnboardingPlan`, `addOnboardingFirstClinic`, `completeOrganizationOnboarding` in `frontend/src/mocks/store.js`), not simulated. Verified working end-to-end via Playwright.
- **Mock data added:** `SUBSCRIPTION_PLANS` (starter/pro/enterprise, real INR pricing) in `frontend/src/mocks/data/seed.js`, wired into the shared store.

## Open / not yet built

- Backend project itself — `backend/` still holds the old empty Laravel scaffold; Phase 1 (NestJS scaffold + `docker-compose.yml` migration to Postgres) hasn't started.
- Organization branding UI (logo upload, color pickers) — recommendation documented, not built.
- Plan entitlement enforcement — recommendation documented, not built (no guard exists yet since there's no backend).
- Reviews/Messages GraphQL schema needs a short design pass with whoever owns frontend before Phase 11 (mock shapes were reverse-engineered, not confirmed as final).
- `test-suggestion/` implementation wave — in progress via 5 background agents; results get appended to `frontend-suggestions-implementation-log.md` as each completes. 🟢 Low priority items across all 47 files are explicitly deferred, not done.
