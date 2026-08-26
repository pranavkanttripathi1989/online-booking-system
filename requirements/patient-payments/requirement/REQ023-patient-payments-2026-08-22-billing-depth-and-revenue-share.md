---
id: REQ023
type: requirement
feature: patient-payments
created: 2026-08-22
updated: 2026-08-24
status: in-progress
parent: REQ004
related: [REQ004, REQ040, REQ047, PLAN064]
---

# Billing depth: mixed tenders, day-end close, doctor revenue-share, and reconciliation

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §9 **M10 — Billing, Invoicing & Patient Payments** (`FR-BIL-01`–`FR-BIL-14`) and §11.1 Flow A refinements. Cross-referenced against `backend/src/appointment-payments` (249 lines, 22 tests) and `project-plans/analysis/02-findings-register.md` F-07/F-17.

## Current state vs. PRD ambition

`REQ004` already delivered a real, tested Razorpay integration: signed order creation, HMAC signature verification with `timingSafeEqual`, and a `finances/index.jsx` page. This is a genuinely solid foundation for online prepayment, and this requirement builds on it rather than replacing it.

The PRD's billing ambition is materially broader than "take an online payment," and covers the physical counter, which the current build barely touches:

1. **No mixed-tender billing.** `FR-BIL-02` wants cash/UPI/card/netbanking/wallet/cheque/credit and split tenders on one bill. Today, billing is Razorpay-only; there is no counter cash/UPI-QR flow and no concept of splitting one bill across tenders.
2. **No day-end closing.** `FR-BIL-08` (expected-vs-actual cash reconciliation, denomination sheet, shift handover) has no equivalent — there is no `Shift`/`CashDrawer` concept.
3. **No doctor revenue-share.** `FR-BIL-11` (per-service or per-consult share, percentage or flat, payout statements with TDS) doesn't exist; `ClinicianBranch`-style fee/share fields aren't modelled.
4. **No corporate/TPA credit billing** (`FR-BIL-10`) — bill-to-organisation with statements and ageing is unbuilt; this overlaps with `REQ031` (insurance) for the payer side specifically, but the corporate-credit case (a company paying its employees' bills directly, no insurance involved) is broader than insurance and belongs here.
5. **GST fields are asymmetric.** `project-plans` F-17 already found GST columns exist on `PaymentTransactions` (SaaS billing) but not on `AppointmentPayments` (patient payments) — a hard blocker for statutory-compliant patient invoices. This requirement inherits that finding as its own P0 item rather than re-discovering it.
6. **No reconciliation console** (`FR-BIL-12`) — gateway settlement files aren't matched against system records anywhere.
7. **The Razorpay order-creation mutation is anonymous** (`project-plans` F-07) — `createRazorpayOrder` is `@Public()` with no ownership check, allowing anonymous order creation against any known appointment id. This requirement's mixed-tender work should not ship until that finding is fixed, since it extends the same billing surface.

## Gap classification

- **Extend existing:** GST fields on `AppointmentPayments`; fix `createRazorpayOrder`'s missing auth check; the existing `finances/index.jsx` page and its backing resolvers as the base for mixed-tender display.
- **Net-new:** counter tender types (cash/UPI-QR/card-POS-reference/cheque/credit), split-tender billing, day-end close, doctor revenue-share and payout, corporate/TPA credit billing, reconciliation console, accounting exports.
- **Already satisfied:** online prepayment via Razorpay with real signature verification, refund initiation.

## Phase assignment

PRD Phase: `FR-BIL-01`–`05`, `07`–`09` are **MVP (P0)** — mixed tenders and day-end close are treated as day-one clinic-operations requirements, not later polish, which matches the PRD's own §2.3.3 ("cash and UPI dominate the counter... billing must handle partial payments, cash, UPI QR, cards, and mixed tenders"). `FR-BIL-06`, `10`–`13` are **V1 GA (P1)**.

## Dependencies

- **Requires:** `project-plans` F-07 and F-17 fixed as part of this requirement's own P0 scope, not deferred.
- **Blocks:** `REQ031` (insurance) needs the bill-splitting mechanism this module builds (payer-payable vs. patient-payable) as its foundation — build the generic split-billing capability here, and have insurance's benefit-wallet logic be one more source of a split, not a second parallel billing engine.

## User stories

### Epic: Counter billing

**US-BIL-01** — As front-desk staff, I want to compose a bill from services rendered and products dispensed and accept a mix of cash and UPI on the same bill, so that a patient paying partly by card and partly in cash isn't a workaround.
- PRD refs: FR-BIL-01, FR-BIL-02
- Priority: P0
- Acceptance criteria: given a ₹800 bill, when ₹500 is paid by UPI and ₹300 in cash, then the bill closes fully paid with both tenders individually recorded and individually reconcilable.

**US-BIL-02** — As front-desk staff, I want a dynamic UPI QR at the counter that auto-detects payment and closes the bill, so that I don't have to manually mark a UPI payment as received.
- PRD refs: FR-PAY-05
- Priority: P0
- Acceptance criteria: given a QR is generated for a bill amount, when the payment is detected via webhook, then the bill auto-closes without staff intervention — reconciled by webhook **and** a scheduled poll per `FR-PAY-03`, never client-side callback alone.

**US-BIL-03** — As a Branch Manager, I want discounts to require a reason code and, above a threshold, an approval, so that discounting is auditable rather than an unchecked front-desk decision.
- PRD refs: FR-BIL-04
- Priority: P0
- Acceptance criteria: given a discount above the configured threshold, it cannot be applied without a second, higher-role approval, and every discount (approved or not) is written to the audit log.

### Epic: Day-end operations

**US-BIL-04** — As a Branch Manager, I want a day-end close showing expected vs. actual cash by user with a denomination sheet, so that a shortfall is caught the same day, not discovered weeks later.
- PRD refs: FR-BIL-08
- Priority: P0
- Acceptance criteria: given a shift's recorded cash collections, when day-end close runs, then any variance between expected and counted cash is captured with the counting user's denomination breakdown, and the shift is formally handed over to the next user.

### Epic: Doctor revenue share

**US-BIL-05** — As an Org Admin, I want to configure a clinician's revenue share (percentage or flat, per-service or per-consult) and generate a payout statement, so that visiting-consultant compensation is computed automatically rather than in a spreadsheet.
- PRD refs: FR-BIL-11
- Priority: P1
- Acceptance criteria: given a clinician on a 60% per-consult share, when a month closes, then their payout statement lists every consult, the computed share, any adjustments, and a TDS field ready for the accountant to finalise.

### Epic: Corporate credit and reconciliation

**US-BIL-06** — As an Accountant, I want to bill a corporate account directly (not the individual patient) and track ageing against a monthly statement, so that employer-paid visits don't need up-front cash from the employee.
- PRD refs: FR-BIL-10
- Priority: P1
- Acceptance criteria: given a patient tagged to a corporate account, their bill routes to that account's statement rather than requiring immediate patient payment, and the statement's ageing report flags overdue balances.

**US-BIL-07** — As an Accountant, I want a reconciliation console matching the gateway's settlement file against system-recorded payments, so that a mismatch surfaces as an exception, not a silent gap in the books.
- PRD refs: FR-BIL-12
- Priority: P1
- Acceptance criteria: given a settlement file is imported, matched payments are auto-confirmed and unmatched entries land in an exception queue for manual review.

### Epic: Fixes inherited from prior findings

**US-BIL-08** — As the system, I want `createRazorpayOrder` to require authentication and verify the caller is the appointment's patient or authorised staff, so that anyone who learns an appointment ID cannot generate unbounded orders against it.
- PRD refs: n/a — closes `project-plans` F-07
- Priority: P0
- Acceptance criteria: given an unauthenticated or unrelated-caller request, order creation is refused; given the patient or authorised staff, it proceeds exactly as today.

**US-BIL-09** — As an Accountant, I want GST fields (place of supply, HSN/SAC, CGST/SGST/IGST split, GSTIN) on patient payments the same way they already exist on SaaS billing, so that a clinic can issue a statutorily compliant invoice for a consultation.
- PRD refs: FR-BIL-06 — closes `project-plans` F-17
- Priority: P0
- Acceptance criteria: given a patient payment for a taxable item, the resulting invoice carries correct GST fields and a gapless per-branch invoice number, matching the pattern `FR-BIL-07` and `PRD §14.2` specify.

## Data model impact

- `AppointmentPayments` gains GST fields mirroring `PaymentTransactions`' existing structure (per `project-plans` F-17's own recommendation): place of supply, HSN/SAC, CGST/SGST/IGST amounts, GSTIN.
- New `Shifts`/`CashReconciliation` tables for day-end close.
- New `RevenueShareRules` and `PayoutStatements` tables scoped per clinician-branch assignment.
- New `CorporateAccounts` table with its own credit terms, linked from `Patients` via a nullable FK.
- New `SettlementReconciliation` table for the gateway-vs-system matching console.
- Invoice numbering: a sequence table with row-level locking per `(branch_id, series, financial_year)`, per `PRD §14.2`'s explicit constraint — this is the same gapless-numbering requirement the pharmacy module (`REQ022`) needs, and should share one implementation.

## Non-functional notes

`FR-PAY-06`/`07` (idempotency keys on payment writes; no card data ever touching our servers) should be treated as already-required practice given the existing Razorpay integration, and explicitly verified as part of this requirement's test plan rather than assumed already covered.

## Open questions

None raised in PRD §19 specific to this module.
