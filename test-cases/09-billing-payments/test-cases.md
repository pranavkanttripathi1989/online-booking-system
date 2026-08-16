# Billing & Payments — Test Cases

**Domain covers:** Razorpay patient-payment flow (order creation, checkout, signature verification), GST invoicing (GSTIN, HSN/SAC, CGST/SGST/IGST), `PaymentTransactions` persistence, tenant SaaS-subscription billing (`SubscriptionPlans`/`OrganizationSubscriptions`, kept on Stripe per the plan's Phase 8 note), plan-based entitlements/feature-gating (`max_clinics`, `max_users`, `features` JSON), and the Manager Billing / Analytics-Finances pages.
**Grounded in:** `schema.prisma` (`PaymentTransactions`, `SubscriptionPlans`, `OrganizationSubscriptions`, `StripeConfigurations`), `context/backend-implementation-plan.md` India table + Phase 3.5 (entitlements) + Phase 8, `requirements/organization-branding-and-management-requirements.md` §3.3 (plan tiers), `context/frontend-contract-analysis.md §2/§7` (billing has only a local `CreatePaymentTransaction` mutation today, no invoice/query contract exists), `test-plan/manager/manager-billing-test-plan.md`, `test-plan/16-03-2026-not-done/manager-billing-test-plan-done.md`, `test-plan/analytics-finances-test-plan.md`, `test-result/manager-billing-test-results.md`, `test-result/analytics-finances-test-results.md`, `test-suggestion/manager-billing-test-suggestion.md`, `test-suggestion/analytics-finances-test-suggestion.md`.
**Key net-new requirements (not in old QA docs, which assumed Stripe/GBP):** Razorpay signature verification, GST calculation correctness, integer-paise money handling, `SubscriptionPlans`/`OrganizationSubscriptions`-driven entitlement limits. These are written fresh against the schema, not derived from prior manual QA.

---

## 1. Unit Test Cases

### TC-BILL-UNIT-001 — Rupee-to-paise conversion has no float rounding error
- **Priority:** Critical
- **Steps:** Convert `₹1,234.56` to paise via the money-handling utility, then convert the stored `Int` (123456) back to a display string.
- **Expected Result:** Round-trips to exactly `₹1,234.56` — no `0.1 + 0.2 = 0.30000000000000004`-style float drift. Guards the schema decision to store `Int` paise instead of `Float` rupees (`PaymentTransactions.amount`, `SubscriptionPlans.price_monthly/yearly`, `Products.price`, `ProductVariations.price`).

### TC-BILL-UNIT-002 — Razorpay signature verification accepts a valid signature
- **Priority:** Critical
- **Preconditions:** A `razorpay_order_id` + `razorpay_payment_id` pair and the correct HMAC-SHA256 signature computed with the Razorpay key secret.
- **Steps:** Call `verifyRazorpaySignature(order_id, payment_id, signature)`.
- **Expected Result:** Returns `true`. This is the single check standing between "payment happened" and "attacker POSTed a fake success payload" — must be exercised with a real Razorpay test-mode secret, not a stub.

### TC-BILL-UNIT-003 — Razorpay signature verification rejects a tampered signature
- **Priority:** Critical
- **Steps:** Call `verifyRazorpaySignature(order_id, payment_id, "tampered_signature_value")`.
- **Expected Result:** Returns `false`. No exception leaks internal secret material in any thrown error.

### TC-BILL-UNIT-004 — GST split: intra-state transaction computes CGST + SGST, not IGST
- **Priority:** Critical
- **Preconditions:** Clinic's `GSTIN` state code matches the patient/billing address state code; `gst_rate = 18.0`; base amount = 100000 paise (₹1,000).
- **Steps:** Call the GST-calculation function.
- **Expected Result:** `cgst_amount = 9000`, `sgst_amount = 9000`, `igst_amount = null`/`0` — CGST+SGST sum equals `gst_rate` applied to base, split evenly per India's intra-state GST rule.

### TC-BILL-UNIT-005 — GST split: inter-state transaction computes IGST only
- **Priority:** Critical
- **Preconditions:** Clinic's GSTIN state code differs from the billing address state code; same `gst_rate = 18.0`, base = 100000 paise.
- **Steps:** Call the GST-calculation function.
- **Expected Result:** `igst_amount = 18000`, `cgst_amount = null`/`0`, `sgst_amount = null`/`0` — the two GST regimes (intra vs inter-state) must never both populate on the same transaction.

### TC-BILL-UNIT-006 — GST calculation rejects an invalid GSTIN format
- **Priority:** High
- **Steps:** Validate GSTIN strings `"27AAAAA0000A1Z5"` (valid 15-char format), `"12345"` (too short), `"27AAAAA0000A1Z"` (14 chars).
- **Expected Result:** First accepted; second and third rejected — matches the 15-character alphanumeric GSTIN pattern (2-digit state code + PAN + entity code + Z + checksum).

### TC-BILL-UNIT-007 — Entitlement check: `max_clinics` blocks at cap, allows below cap
- **Priority:** Critical
- **Preconditions:** An org's active `OrganizationSubscriptions.plan` has `max_clinics = 2`; the org currently has 2 non-deleted `Clinics` rows.
- **Steps:** Call `checkEntitlement(org, 'max_clinics')`.
- **Expected Result:** Returns `false` (at cap) when count = 2; returns `true` when a clinic is soft-deleted first, bringing the live count to 1. Guards `EntitlementsGuard` from `context/backend-implementation-plan.md` Phase 3.5.

### TC-BILL-UNIT-008 — Entitlement check: `max_users` counts only active, non-deleted users
- **Priority:** High
- **Preconditions:** Plan `max_users = 5`; org has 5 `UserProfiles` but 1 has `is_deleted: true`.
- **Steps:** Call `checkEntitlement(org, 'max_users')`.
- **Expected Result:** Live count = 4, so the check allows one more invite — a soft-deleted user must not permanently consume a seat.

### TC-BILL-UNIT-009 — Feature-flag check reads `SubscriptionPlans.features` JSON correctly
- **Priority:** High
- **Preconditions:** Plan `features = {"messaging": true, "sms_reminders": false, "razorpay_payments": true}`.
- **Steps:** Call `hasFeature(org, 'sms_reminders')` and `hasFeature(org, 'messaging')`.
- **Expected Result:** First returns `false`, second returns `true` — an absent key must also default to `false`, not throw.

### TC-BILL-UNIT-010 — Invoice number generation is unique and sequential per organization
- **Priority:** Medium
- **Steps:** Generate 3 invoice numbers in sequence for Org A, then 1 for Org B.
- **Expected Result:** Org A's 3 numbers increment sequentially (e.g. `INV-ORGA-0001`, `-0002`, `-0003`); Org B's number does not continue Org A's sequence — invoice numbering is per-tenant, not global.

### TC-BILL-UNIT-011 — Refund eligibility respects `ProductCancellationRules` fee windows
- **Priority:** High
- **Preconditions:** A `ProductCancellationRules` row with `rule_type: cancellation`, `hours_before_appointment: 24`, `fee_type: percentage`, `fee_amount` representing 20%.
- **Steps:** Compute the refund amount for a cancellation made 30 hours before the appointment, and again for one made 10 hours before.
- **Expected Result:** 30-hours-before case: full refund (outside the fee window). 10-hours-before case: refund = amount minus 20% fee, computed in paise with integer rounding (no fractional paise).

### TC-BILL-UNIT-012 — Currency defaults to INR when unspecified
- **Priority:** Medium
- **Steps:** Construct a `PaymentTransactions` input DTO without a `currency` field.
- **Expected Result:** Defaults to `"INR"` — matches `schema.prisma`'s `@default("INR")`, never silently defaults to `USD`/`GBP` from any leftover generic scaffolding.

### TC-BILL-UNIT-013 — CSV export row formatting quotes special characters
- **Priority:** Low
- **Steps:** Format an invoice row containing a patient name with a non-ASCII character (`"Sophie Müller"`) and a comma-containing service name (`"Consultation, Follow-up"`) for CSV export.
- **Expected Result:** Both fields are wrapped in quotes in the output row so the CSV doesn't misparse on the embedded comma; matches the existing frontend behavior noted in `manager-billing-test-results.md` E7, which this now must hold server-side too once export moves off the client-side mock array.

---

## 2. Backend/API Test Cases

*Run against a real Postgres test database + the actual GraphQL schema, not mocks.*

### TC-BILL-API-001 — `createRazorpayOrder` mutation returns fields the frontend checkout needs
- **Priority:** Critical
- **Preconditions:** A patient is booking a paid appointment for a service with `price = 500000` paise.
- **Steps:** Call `createRazorpayOrder(appointmentId, amount: 500000)`.
- **Expected Result:** Returns `{razorpay_order_id, amount, currency: "INR", key_id}` — the exact shape `RazorpayCheckout` needs client-side (replacing the current `booking/index.jsx` Stripe `CardElement`/`createPaymentMethod` call per `context/backend-implementation-plan.md` Phase 8).

### TC-BILL-API-002 — `confirmPayment` mutation rejects an invalid Razorpay signature
- **Priority:** Critical
- **Steps:** Call `confirmPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature: "forged")`.
- **Expected Result:** Rejected before any `PaymentTransactions` row is written or any appointment status changes — verify via a subsequent count query that no row was inserted. This is the server-side enforcement of TC-BILL-UNIT-003.

### TC-BILL-API-003 — `confirmPayment` with a valid signature persists GST fields correctly
- **Priority:** Critical
- **Preconditions:** Clinic GSTIN present, patient billing address in a different state (inter-state scenario).
- **Steps:** Complete a payment with a valid Razorpay test-mode signature.
- **Expected Result:** `PaymentTransactions` row has `gstin`, `hsn_sac_code`, `gst_rate`, `igst_amount` populated (per TC-BILL-UNIT-005), `cgst_amount`/`sgst_amount` null, `razorpay_payment_id`/`razorpay_order_id`/`razorpay_signature` all stored, `amount` in paise.

### TC-BILL-API-004 — Razorpay webhook endpoint is idempotent on duplicate delivery
- **Priority:** Critical
- **Preconditions:** A `payment.captured` webhook event has already been processed for `razorpay_payment_id = pay_XXX`.
- **Steps:** POST the identical webhook payload a second time (simulating Razorpay's at-least-once delivery guarantee).
- **Expected Result:** No duplicate `PaymentTransactions` row is created and no double notification/email fires — the handler must upsert/dedupe on `razorpay_payment_id`, not blindly insert.

### TC-BILL-API-005 — Razorpay webhook rejects a request with an invalid webhook signature header
- **Priority:** Critical
- **Steps:** POST a webhook payload with a valid-looking body but an `X-Razorpay-Signature` header that doesn't match the HMAC of the raw body against the configured webhook secret.
- **Expected Result:** Rejected with 400, no processing occurs — this is the REST (raw-body) endpoint noted in Phase 8, distinct from the GraphQL-layer signature check in TC-BILL-API-002.

### TC-BILL-API-006 — Cross-tenant isolation: a manager cannot query another organization's invoices
- **Priority:** Critical
- **Preconditions:** Org 1 and Org 2 each have `PaymentTransactions` rows.
- **Steps:** Log in as a manager of Org 1, query the invoices list.
- **Expected Result:** Only Org 1's transactions returned — `PaymentTransactions.client_org_id` scoping enforced server-side, mirroring the multi-tenancy guarantee in `TC-AUTH-API-010`.

### TC-BILL-API-007 — `EntitlementsGuard` blocks `createClinic` once `max_clinics` is reached
- **Priority:** Critical
- **Preconditions:** Org's plan has `max_clinics: 1`; org already has 1 active clinic.
- **Steps:** Call `createClinic` for that org.
- **Expected Result:** Rejected with a `userErrors` entry pointing at upgrading the plan (per Phase 3.5's "clear message pointing at upgrading"), not a generic 500. No `Clinics` row inserted.

### TC-BILL-API-008 — `EntitlementsGuard` blocks `inviteUser`/`createUser` once `max_users` is reached
- **Priority:** Critical
- **Preconditions:** Org's plan has `max_users: 5`; org has exactly 5 active `UserProfiles`.
- **Steps:** Call the invite/create-user mutation for that org.
- **Expected Result:** Rejected with an upgrade-pointing error; existing 5 users are unaffected.

### TC-BILL-API-009 — Feature-gated mutation is hard-blocked when the plan lacks the feature
- **Priority:** High
- **Preconditions:** Org's plan `features = {"razorpay_payments": false}` (e.g. a legacy/basic tier).
- **Steps:** Attempt `createRazorpayOrder` for that org.
- **Expected Result:** Rejected — per Phase 3.5's decision to hard-block features with real per-transaction cost (Razorpay fees, SMS), not soft-gate them.

### TC-BILL-API-010 — Trial expiry job transitions subscription status and soft-locks the tenant
- **Priority:** Critical
- **Preconditions:** An `OrganizationSubscriptions` row with `status: trial`, `trial_ends_at` in the past, no successful payment recorded.
- **Steps:** Run the BullMQ trial-expiry scheduled job.
- **Expected Result:** `status` transitions to `expired`. A subsequent `createAppointment` call for that org is rejected (soft-lock), but a `GET`-style query for existing appointments/patients still succeeds (data stays readable) — per Phase 3.5's explicit "don't hard-delete or lock out billing/admin screens" requirement.

### TC-BILL-API-011 — `refundPayment` mutation updates transaction status and is idempotent
- **Priority:** Critical
- **Preconditions:** A `PaymentTransactions` row with `status: "paid"`.
- **Steps:** Call `refundPayment(transactionId)` twice in a row.
- **Expected Result:** First call transitions `status → "refunded"` and calls the Razorpay refund API. Second call is rejected (already refunded) rather than issuing a duplicate refund against Razorpay — mirrors the frontend's existing optimistic refund UX (`TC-MGR-BILL-27` in `manager-billing-test-results.md`) but now enforced server-side.

### TC-BILL-API-012 — Invoices query supports the same filter dimensions the frontend already implements
- **Priority:** High
- **Preconditions:** Seeded invoices with mixed `status` (paid/pending/refunded) and `method` (card/cash/insurance).
- **Steps:** Query invoices with `status: PENDING, method: INSURANCE`.
- **Expected Result:** Returns only the intersection — this backend contract must satisfy the combined-filter behavior already proven in the mock UI (`TC-MGR-BILL-23`), so the frontend's filter logic doesn't need to change when wired to a real query.

### TC-BILL-API-013 — Subscription billing (tenant SaaS billing) stays on Stripe, isolated from patient-payment Razorpay path
- **Priority:** Medium
- **Steps:** Inspect the resolver wiring for `OrganizationSubscriptions`/`StripeConfigurations` vs `PaymentTransactions`'s Razorpay fields.
- **Expected Result:** No resolver mixes the two gateways on a single transaction — `stripe_customer_id`/`stripe_subscription_id` populate only for org-subscription billing; `razorpay_order_id`/`razorpay_payment_id`/`razorpay_signature` populate only for patient-facing payments. Confirms the Phase 8 decision to keep Stripe for tenant SaaS billing while patient payments move to Razorpay.

### TC-BILL-API-014 — `me`/dashboard query surfaces plan entitlements for frontend upsell prompts
- **Priority:** High
- **Steps:** Query the field that Phase 3.5 specifies should carry `organization { plan, features, max_clinics, max_users, clinicsUsed, usersUsed }`.
- **Expected Result:** Returns live usage counts (`clinicsUsed`, `usersUsed`) alongside the plan's limits, so the frontend can render "3 of 5 clinics used — Upgrade to add more" instead of only discovering the cap when a mutation fails.

---

## 3. Functional / E2E Test Cases

*Full frontend + backend journeys, run via Playwright against a running backend (not mocks).*

### TC-BILL-E2E-001 — Patient completes a booking payment via Razorpay Checkout end-to-end
- **Priority:** Critical
- **Steps:** Complete the booking wizard as a patient, reach the payment step, complete Razorpay's test-mode checkout (UPI or test card) instead of the current Stripe `CardElement`.
- **Expected Result:** Appointment status becomes `confirmed`, a `PaymentTransactions` row exists with `status: paid`, and the patient sees a confirmation screen with the correct amount in ₹ — replaces the hardcoded `pk_test_placeholder` Stripe flow noted in `frontend-contract-analysis.md §7`.

### TC-BILL-E2E-002 — Failed/cancelled Razorpay checkout leaves the appointment unconfirmed, not partially booked
- **Priority:** Critical
- **Steps:** Start the booking wizard, reach payment, cancel the Razorpay checkout modal without completing it.
- **Expected Result:** No appointment is created (or it remains in a `pending_payment` state clearly distinguished from `confirmed`) — the slot is not silently reserved forever, and it's still bookable by another patient after a reasonable timeout.

### TC-BILL-E2E-003 — Manager views a real GST-compliant invoice after a patient payment
- **Priority:** High
- **Preconditions:** A patient has completed a paid appointment for a clinic with a valid GSTIN.
- **Steps:** As a manager, open `/manager/billing`, click "View" on the corresponding invoice.
- **Expected Result:** Invoice detail shows GSTIN, HSN/SAC code, and the CGST/SGST or IGST breakup matching TC-BILL-UNIT-004/005 — closes the gap flagged in `manager-billing-test-suggestion.md` SUG-BILL-004 (view was a stub) and satisfies the GST requirement from `backend-implementation-plan.md`.

### TC-BILL-E2E-004 — Manager issues a refund and it reflects across Billing and Finances pages
- **Priority:** Critical
- **Steps:** As a manager, refund a paid invoice on `/manager/billing`, then navigate to `/finances`.
- **Expected Result:** `/manager/billing` shows the invoice as refunded (status chip flips, refund icon disappears — same UX as `TC-MGR-BILL-27`, now backend-backed instead of optimistic-only); `/finances`'s Payment History tab reflects the same transaction as refunded, since both now read the same backend data instead of two independent mock arrays.

### TC-BILL-E2E-005 — Organization at its plan's clinic cap sees an upgrade prompt, not a silent failure
- **Priority:** High
- **Preconditions:** Org on the "Starter" plan (`max_clinics: 1`) already has 1 clinic.
- **Steps:** As an admin/manager, attempt to create a second clinic via the UI.
- **Expected Result:** UI shows an "Upgrade to add more clinics" prompt sourced from the entitlements data (TC-BILL-API-014), not a raw GraphQL error dumped to the console — closes the frontend-follow-up gap noted in Phase 3.5.

### TC-BILL-E2E-006 — Trial expiry soft-locks new bookings but keeps existing data visible
- **Priority:** Critical
- **Preconditions:** An org's 14-day trial has expired with no payment on file.
- **Steps:** Log in as that org's manager, attempt to create a new appointment; separately, view the existing patients/appointments list.
- **Expected Result:** New-appointment creation is blocked with a clear "trial expired, please subscribe" message; existing patient/appointment data remains fully viewable — verifies TC-BILL-API-010's guarantee end-to-end through the actual UI.

### TC-BILL-E2E-007 — Analytics/Finances date-range selection stays in sync across pages
- **Priority:** Medium
- **Preconditions:** Grounded in `analytics-finances-test-results.md` TC-FIN-009 / SUG-AF-008 (currently implemented via `localStorage`).
- **Steps:** On `/analytics`, set the date range to "Last 3 Months"; navigate to `/finances` → Revenue Chart tab.
- **Expected Result:** Once both pages are backend-driven, the same behavior must hold: the Revenue Chart tab pre-selects "Last 3 Months" and its KPI totals/chart reflect real aggregated data for that exact window, not just a re-read of the same stale mock array.

### TC-BILL-E2E-008 — CSV export from Billing reflects the live filtered dataset, not a stale client cache
- **Priority:** Medium
- **Preconditions:** Grounded in `manager-billing-test-results.md` TC-MGR-BILL-15/SUG-BILL-006 (currently a client-side Blob export of the mock array).
- **Steps:** Apply Status=Paid + a search term on `/manager/billing`, click Export.
- **Expected Result:** The downloaded CSV contains exactly the rows currently matching both filters, fetched from the backend's filtered query result — not the full unfiltered dataset trimmed client-side after the fact.

---

## 4. Frontend Test Cases

*Component/page-level, run against the existing mock store (`frontend/src/mocks/`) — these should pass today, independent of backend readiness.*

### TC-BILL-FE-001 — Billing KPI cards render correct values and border colors
- **Priority:** Medium
- **Preconditions:** Grounded in `manager-billing-test-results.md` TC-MGR-BILL-02 (currently passing against `INVOICES_SEED`).
- **Steps:** Navigate to `/manager/billing`, inspect the 4 KPI cards.
- **Expected Result:** Total Revenue (green top border), Outstanding Invoices (amber), Refunds This Month (red), Avg Rev/Appointment (teal) — each with the correct sub-label text, matching the mock constants exactly.

### TC-BILL-FE-002 — Payment Method filter narrows the invoice table correctly
- **Priority:** Medium
- **Steps:** On `/manager/billing`, select "Card", then "Cash", then "Insurance" from the Payment Method dropdown.
- **Expected Result:** Row counts match `TC-MGR-BILL-06/07/08` (3/1/1 respectively against the 5-invoice mock seed), with the "N of 5" counter chip updating each time.

### TC-BILL-FE-003 — Status filter combined with search narrows to the exact intersection
- **Priority:** High
- **Preconditions:** Grounded in `TC-MGR-BILL-23` (already implemented and passing).
- **Steps:** Set Status = "Paid", type "James" in the search box.
- **Expected Result:** Exactly 1 row (INV-002, James Brown) — proves all three filter dimensions (method, status, search) compose with AND semantics, not silently overriding each other.

### TC-BILL-FE-004 — Empty filtered state shows a "Clear filters" recovery action
- **Priority:** Medium
- **Preconditions:** Grounded in `TC-MGR-BILL-24`.
- **Steps:** Set Status = "Refunded" and search "Omar Hassan" (a paid invoice, guaranteeing zero matches).
- **Expected Result:** Table is replaced by an empty state (icon + "No invoices match your filters.") with a visible "Clear filters" button; clicking it resets all three filters and restores all 5 rows in one action.

### TC-BILL-FE-005 — Refund confirmation dialog shows the exact amount and patient before any mutation
- **Priority:** Critical
- **Preconditions:** Grounded in `TC-MGR-BILL-25/27`.
- **Steps:** Click the refund icon on a paid invoice (e.g. INV-001, Emma Wilson, £85).
- **Expected Result:** Dialog title "Issue Refund", message reads "Issue a refund of £85 for Emma Wilson (INV-001)? This action cannot be undone." — no state changes until "Refund" is explicitly clicked; clicking "Cancel" leaves the invoice's status chip and refund-icon visibility completely unchanged (`TC-MGR-BILL-26`).

### TC-BILL-FE-006 — Refund icon visibility is gated strictly by invoice status
- **Priority:** High
- **Steps:** Inspect the Actions column for a paid, a pending, and an already-refunded invoice.
- **Expected Result:** Refund icon appears only on the paid invoice (`inv.status === 'paid'`) — absent for pending and already-refunded rows, per `TC-MGR-BILL-14`.

### TC-BILL-FE-007 — CSV export filename and content respect the active period + filters
- **Priority:** Medium
- **Preconditions:** Grounded in `TC-MGR-BILL-15`/SUG-BILL-006.
- **Steps:** With the date-period filter set to "This Month", click Export.
- **Expected Result:** Downloaded filename is `billing-export-this-month.csv`; the file's rows match exactly the currently-filtered invoice set, and any cell containing a special character (e.g. "Sophie Müller") is quoted in the CSV, per edge case E7.

### TC-BILL-FE-008 — Revenue Breakdown chart legend correctly labels both bar series
- **Priority:** Low
- **Steps:** View the "Revenue Breakdown" stacked bar chart on `/manager/billing`.
- **Expected Result:** A legend renders above the chart reading "Clinic Fees" (dark teal) and "Service Fees" (lighter teal) — per `SUG-BILL-010`, closing the previously-unlabelled-colors gap.

### TC-BILL-FE-009 — Finances invoice detail drawer shows an overdue warning only when applicable
- **Priority:** Medium
- **Preconditions:** Grounded in `TC-FIN-008`/SUG-AF-007.
- **Steps:** On `/finances` → Payment History, open the invoice drawer for an overdue transaction (TXN-007), then for a paid one (TXN-001).
- **Expected Result:** Overdue transaction's drawer shows a red overdue-warning banner; the paid transaction's drawer does not — the banner is conditioned strictly on `tx.status === 'overdue'`, never shown by default.

### TC-BILL-FE-010 — Analytics "Compare" mode toggles prior-period deltas on KPI cards
- **Priority:** Medium
- **Preconditions:** Grounded in `TC-ANALYTICS-010`.
- **Steps:** Click "Compare" in the Analytics header.
- **Expected Result:** Button switches to a filled "Comparing" state (`aria-pressed="true"`); each of the 4 KPI cards reveals a delta badge ("vs prior period: +X%", "Prior: N") with correct sign-based color; clicking again hides the badges and resets `aria-pressed`.

### TC-BILL-FE-011 — Weekly timeframe chart data responds to the date-range selector
- **Priority:** Medium
- **Preconditions:** Grounded in `TC-ANALYTICS-011` (regression guard for the previously-fixed `BUG-NEW-AF-002`).
- **Steps:** Switch Analytics to "Weekly" timeframe, then change the date range between "Last 1 Month" and "Last 3 Months".
- **Expected Result:** Weekly chart shows 7 data points for "Last 1 Month" and 14 for "Last 3 Months" — must not regress back to the old static-7-day bug where weekly mode ignored the date-range control entirely.

### TC-BILL-FE-012 — Finances Overdue/Pending/Paid status toggle filters transactions correctly
- **Priority:** Medium
- **Preconditions:** Grounded in `TC-FIN-003`/`BUG-AF-005`.
- **Steps:** On `/finances`, click the "Overdue" status toggle.
- **Expected Result:** Exactly 2 transactions shown (TXN-007, TXN-008), each with a red "Overdue" left-accent chip; count label reads "2 transactions".

### TC-BILL-FE-013 — Export Report on Finances respects the currently active filter set
- **Priority:** Medium
- **Preconditions:** Grounded in `TC-FIN-007`.
- **Steps:** Export with no filters applied (9 transactions), then filter to "Overdue" and export again.
- **Expected Result:** First export's success snackbar reads "Report downloaded (9 transactions)"; second reads "Report downloaded (2 transactions)" — the export must always read from the `filtered` array, never the raw unfiltered dataset.

### TC-BILL-FE-014 — All billing/finance icon-action buttons have accessible labels
- **Priority:** Low
- **Preconditions:** Grounded in `SUG-BILL-015`/`TC-MGR-BILL-12/13/14` and `TC-FIN-012`.
- **Steps:** Inspect the DOM for the View, Download, Refund, Export, and receipt-drawer icon buttons.
- **Expected Result:** Every icon button carries a descriptive `aria-label` (e.g. `"View invoice INV-001"`, `"Download invoice INV-001"`, `"Close drawer"`, `"Print receipt"`) — none rely on Tooltip text alone for accessible naming.
