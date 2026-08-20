---
id: REQ004
type: requirement
feature: patient-payments
created: 2026-08-20
updated: 2026-08-20
status: in-progress
parent: null
related: []
---

# Patient Payments & Finances — Requirements

**Why this exists:** `frontend/src/pages/finances/index.jsx` (route `/finances`) is a fully-built, 567-line UI — KPI cards, a transactions table, saved payment methods, a revenue/expense chart — running entirely on a hardcoded `TRANSACTIONS`/`CARDS`/`ALL_MONTHLY_REVENUE` array with zero backend. `manager/Dashboard.jsx`'s "Recent Transactions" table reads a `getTransactionsByDate` query with no backing resolver at all (`context/open-questions.md` #1). This is the #1 item on the last status audit's punch list: nothing captures money from a patient today beyond the UI pretending to.

**What already exists, grounded in the real schema:** `PaymentTransactions` (`backend/prisma/schema.prisma:454`) — `id, client_org_id, subscription_id, amount (paise), currency, status, stripe_*, razorpay_order_id/payment_id/signature, gstin, hsn_sac_code, gst_rate, cgst/sgst/igst_amount, transaction_date, metadata`. This model is **explicitly scoped to `ClientOrganizations`/`OrganizationSubscriptions`** — tenant SaaS-subscription billing only (CLAUDE.md's own architecture notes). It has **no relation to `Appointments` or `Patients` at all**. Per-appointment patient payments need a distinct model — this requirement scopes that model and the real Razorpay integration, not a reuse of `PaymentTransactions`.

## Scope

### In scope
1. **A `AppointmentPayments` (name TBD in the implementation plan) model** — one row per patient payment against a specific appointment/product, distinct from `PaymentTransactions`. Real Razorpay order/capture/webhook lifecycle, not a "record only" stub (the current `public.service.ts` comment: *"Records the transaction only — no real Stripe/Razorpay API call"* is the thing this requirement replaces).
2. **`manager/Dashboard.jsx`'s `getTransactionsByDate` query** — real resolver backing the existing frontend contract (`{id, createdAt, amount, status: succeeded|pending|failed, appointment{clinician{name}, patient{firstName,lastName}, product{name}}}`, per `open-questions.md` #1's exact recorded shape).
3. **`finances/index.jsx`'s real data**: the transactions table (income **and** expense rows — the mock data includes non-patient expense rows like "Office Supplies"/"Equipment Lease", so this is a general clinic ledger, not patient-payments-only), the revenue/expense chart, KPI cards.
4. **GST invoicing** on captured patient payments — GSTIN, HSN/SAC code, CGST/SGST/IGST split, matching the fields `PaymentTransactions` already has for the SaaS-billing side (mirror the pattern, don't invent a new one).
5. **Money as paise (`Int`)**, converted to rupees only at the resolver boundary — CLAUDE.md hard rule 9, non-negotiable.

### Explicitly out of scope for this requirement (flag as a later phase if wanted)
- **Saved payment methods (`CARDS` in the mock)** — storing a patient's card on file. Razorpay's saved-card/tokenization flow is a distinct, higher-compliance feature (PCI scope) — don't fold it into the base capture flow.
- **Payment-on-account / standing credit balance** (Semble gap analysis, Phase 4) — depends on memberships existing first, which don't exist yet.
- **Invoice line items / partial payments** (Semble gap analysis, Phase 4) — the current scope is single-transaction capture per appointment, matching what `finances/index.jsx`'s mock UI actually models today (one row per transaction, no partial-payment UI exists to build against).
- **In-clinic payment terminal integration** — online-booking-first, terminal hardware is explicitly lower priority per the existing competitive-gap requirement.

## Constraints (from CLAUDE.md, restated for this domain)

- **Vendor is fixed: Razorpay.** No substituting "for simplicity" — build/test against Razorpay's real sandbox, not a stub. **This requirement cannot reach `status: done` without real Razorpay sandbox credentials** — that's a blocker for a human to resolve (see Open Questions below), not something to work around by inventing fake ones.
- **Webhook/payment verification**: always verify the HMAC signature server-side before trusting a client-reported "payment succeeded" state (`requirements/security-requirements.md` §5) — never trust the frontend alone.
- **Multi-tenancy**: every query/mutation scoped by `client_org_id` from the JWT (CLAUDE.md hard rule 6), same as every other domain this project has built — a `createPayment`-style mutation must validate the appointment/clinic it's paying for belongs to the caller's org, the same create-path check five other domains needed a dedicated fix for this session.
- **Match the existing contract** (CLAUDE.md hard rule 7): `manager/Dashboard.jsx`'s `getTransactionsByDate` shape is already fixed by the live frontend code — don't redesign it, implement against it.

## Open questions (not resolved here — needs a decision before implementation-plan work can finish)

1. ~~**Razorpay sandbox credentials**~~ — **resolved 2026-08-20**, provided by the user mid-session. Real payment capture built against them — see [PLAN012](../../../implementation-plans/patient-payments/requirement/PLAN012-patient-payments-2026-08-20-razorpay-capture.md). No real webhook endpoint yet (needs a publicly reachable URL not available in this local sandbox) — Razorpay's Payment Verification (HMAC) pattern used instead, which is fully real cryptographic verification, not a lesser substitute.
2. ~~**Model name and shape for per-appointment payments**~~ — **resolved**: `AppointmentPayments`, a separate model (not a `PaymentTransactions` discriminator column), confirmed correct once building it surfaced that the pre-existing `createPaymentTransaction` stub was already awkwardly retrofitting `appointment_id` into `PaymentTransactions.metadata` — exactly the anti-pattern this question was worried about.
3. **Expense tracking** (`TRANSACTIONS` rows with `type: 'expense'`, e.g. "Office Supplies", "Equipment Lease") — still open. Not needed for payment capture (PLAN012's scope); blocks `finances/index.jsx`'s rewrite, the next slice.

## Acceptance criteria (high-level — implementation plan owns the detail)

- A patient can pay for a real appointment via a real Razorpay checkout flow; the payment is captured, webhook-verified, and recorded against the correct appointment/clinic/org.
- `manager/Dashboard.jsx` and `finances/index.jsx` both show real data with zero mock fallback for anything in scope above.
- GST fields populate correctly on a captured payment for an org with GST details configured.
- Cross-tenant isolation: a manager from org A cannot see, capture, or refund a payment belonging to org B's appointment — with an explicit rejection test, per CLAUDE.md hard rule 6.
