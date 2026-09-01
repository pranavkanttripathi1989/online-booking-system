---
id: REQ033
type: requirement
feature: platform-billing
created: 2026-08-22
updated: 2026-09-02
status: done
parent: REQ032
related: [REQ032, REQ178]
---

> **Fulfilled by `REQ178`** (2026-09-02), with one material deviation from
> this document's own gap-classification/data-model sketch: `REQ178`
> shipped the full super-admin subscription-management surface this
> requirement scoped (create/cancel, invoicing, Razorpay Subscriptions
> UPI AutoPay/eNACH collection, the RBI 24h pre-debit-notice/AFA/mandate-
> pause rights below), but as one direct user request rather than a
> `REQ032`-dependent follow-on, and folded the `PaymentMandates`/
> `PreDebitNotifications` tables sketched below into `PlatformSubscriptions`/
> `PlatformInvoices` fields instead of standalone tables — see `REQ178`'s
> own "Deliberately NOT built" section for the one acceptance criterion
> (US-BILL-04, automatic fallback above ₹15,000) not built. Kept here for
> provenance; read `REQ178` for current state.

# Tenant subscription collection: UPI AutoPay / e-mandate compliance

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §11 **Payments & Money Movement**, Flow B specifically (`FR-PAY-08`–`14`), governed by RBI's *Digital Payments — E-mandate Framework, 2026* (effective 21 April 2026, per the PRD's own citation).

## Current state vs. PRD ambition

`CLAUDE.md` states Stripe is "kept only for tenant SaaS-subscription billing" — but no recurring-collection flow for tenant subscriptions exists in the codebase today; this is a stated intent with no implementation. The PRD's requirement is materially more specific than "charge a card monthly": it is a **regulatory compliance requirement** with hard rules (mandate registration with Additional Factor Authentication, a mandatory 24-hour pre-debit notice, a ₹15,000 per-transaction ceiling for OTP-free collection, mandate visibility/pause/cancel rights, and zero merchant-side mandate fees). This distinguishes Flow B (provider→CareOS) from Flow A (patient→provider, already real via Razorpay in `REQ004`/`REQ023`) and this requirement is scoped to Flow B only.

## Gap classification

- **Net-new, entirely.** No e-mandate or recurring-collection infrastructure exists for tenant billing.

## Phase assignment

PRD Phase: **V1 GA (P1)**, matching the roadmap's Q4 milestone ("subscription billing/e-mandate").

## Dependencies

- **Requires:** `REQ032` (the plan/subscription model this collection mechanism bills against).
- **Blocks:** none — Flow A (patient payments) is entirely independent and already shipped.

## User stories

### Epic: Mandate registration and collection

**US-BILL-01** — As a tenant org owner, I want to set up a UPI AutoPay mandate once with OTP/UPI-PIN authentication, so that subsequent monthly charges up to ₹15,000 don't require me to authenticate every cycle.
- PRD refs: FR-PAY-08
- Priority: P1
- Acceptance criteria: given a mandate is registered with Additional Factor Authentication, subsequent debits up to ₹15,000 clear without per-cycle AFA, matching the RBI framework's stated threshold exactly.

**US-BILL-02** — As a tenant org owner, I want a pre-debit notice at least 24 hours before every charge, with the option to opt out of that specific debit or cancel the mandate entirely, so that I'm never surprised by a charge I didn't expect.
- PRD refs: FR-PAY-09, FR-PAY-11
- Priority: P0
- Acceptance criteria: given a scheduled debit, the pre-debit notification is sent at least 24 hours prior, stating amount, date, and merchant; the tenant can opt out of that debit or cancel the mandate at any time via an AFA-authenticated action, and a post-debit confirmation follows every successful collection.

**US-BILL-03** — As the system, I want no fee ever charged to the tenant for using the e-mandate facility itself, so that the platform stays compliant with the RBI framework's explicit no-fee rule.
- PRD refs: FR-PAY-12
- Priority: P0
- Acceptance criteria: the e-mandate mechanism carries zero incremental cost to the tenant beyond the subscription price itself — verified as a specific, named test case, not an assumption.

**US-BILL-04** — As the system, when an invoice exceeds ₹15,000, I want to automatically fall back to split collection, a payment link with AFA, or eNACH, so that larger tenant invoices (e.g., Multi-Clinic or Enterprise plans) still collect reliably within the regulatory ceiling.
- PRD refs: FR-PAY-13
- Priority: P1
- Acceptance criteria: given an invoice above ₹15,000, the fallback method is chosen automatically per configured rules and disclosed to the tenant — never silently split without explanation.

**US-BILL-05** — As the system, when a scheduled debit fails, I want to follow the same dunning sequence as `REQ032`'s subscription lifecycle with a one-tap UPI fallback link, so that a failed auto-debit has an easy recovery path rather than immediately escalating to suspension.
- PRD refs: FR-PAY-14
- Priority: P1
- Acceptance criteria: a failed debit triggers `REQ032`'s existing dunning state machine (`past_due → grace → suspended`), with a UPI payment link offered at every notification step.

## Data model impact

- New `PaymentMandates` table: `id`, `org_id`, `provider_ref`, `max_amount`, `status` (`active|paused|revoked`), `registered_at`.
- New `PreDebitNotifications` table for the mandatory 24-hour-notice audit trail: `id`, `mandate_id`, `amount`, `scheduled_debit_at`, `notified_at`.
- `PlatformInvoice` (from `REQ032`) gains a `collection_method` field (`upi_autopay|enach|payment_link|manual`).

## Non-functional notes

Both the payment aggregator and the merchant carry compliance responsibility for e-mandate rules per the PRD's own note — this must be explicitly covered in the aggregator contract, not assumed to be handled entirely by the vendor.

## Open questions

None raised in PRD §19 specific to this module, though PRD §19.2 ("do we ever take custody of patient payments") is adjacent — this requirement's Flow B is platform-custody by design (the tenant pays the platform directly), which is a different money flow from Flow A and not affected by that open question.
