# MediBook / HealthSync

Multi-tenant SaaS for online doctor/clinic appointment booking, built for the **Indian market**. Read `context/README.md` first — it indexes everything below and states current status.

## Stack (decided, see `context/backend-implementation-plan.md`)

- **Frontend:** React 18 + Vite + MUI v5 + Apollo Client (`frontend/`) — mostly built.
- **Backend:** Node.js + NestJS + Apollo GraphQL (code-first) + Prisma + PostgreSQL + Redis — **not yet scaffolded**. `backend/` currently still holds an old, empty Laravel scaffold (composer.json, no actual app code) — this is being replaced, not extended.
- **`schema.prisma`** lives at repo root (not yet moved into `backend/`) and is the authoritative data model — 30+ models, already extended for Reviews/Messages/onboarding/GST. Run `prisma validate` after editing it.

## Critical fact: the frontend runs 100% on mock data today

`frontend/src/apollo/client.js` aborts any GraphQL request after 2 seconds and silently falls back — there is no way to tell from the UI whether a real backend is running. `frontend/src/mocks/store.js` is a full in-memory backend simulation. Don't assume a page "using GraphQL" actually talks to a server. See `context/frontend-contract-analysis.md §4`.

## India-specific decisions (apply anywhere payments/SMS/email/currency/address come up)

Razorpay (patient payments) · Stripe (kept only for tenant SaaS-subscription billing) · MSG91/Gupshup (OTP SMS) · AWS SES `ap-south-1` (email) · AWS `ap-south-1` hosting · GST fields on `PaymentTransactions` · money stored as **paise** (`Int`), not float rupees · address format is `{line1, line2, city, state, pincode, country}`, not Western postal code. Full rationale in `context/backend-implementation-plan.md`'s India table.

## Before touching backend work

1. Read `context/frontend-contract-analysis.md` — it's the actual contract (every GraphQL op the frontend expects), not a guess.
2. Read `context/backend-implementation-plan.md` — phased plan, has an "Open questions / risks" section at the bottom that must be resolved before Phases 0/11 in particular (Reviews/Messages schema was reverse-engineered from mock data, not confirmed with frontend).
3. Check `context/README.md`'s "Open / not yet built" section before assuming something is done.

## Testing

`test-plan/`, `test-result/`, `test-suggestion/` hold extensive manual QA history per feature (47 suggestion files, dozens of test plans). Reuse these as acceptance criteria rather than writing test scope from scratch. `context/frontend-suggestions-implementation-log.md` tracks an in-progress wave of implementing pending suggestions.
