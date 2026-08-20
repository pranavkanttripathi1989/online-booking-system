---
id: PLAN012
type: requirement
feature: patient-payments
created: 2026-08-20
updated: 2026-08-20
status: done
parent: REQ004
related: []
---

# Implementation plan — Real Razorpay payment capture (REQ004, slice 1 of 2)

The user provided real Razorpay sandbox credentials mid-session, unblocking REQ004 (previously hard-blocked all session). Stored in `backend/.env` (gitignored), documented as a placeholder in `backend/.env.example`.

## Two findings that redirected scope, neither guessed at

1. **The booking flow's payment UI used Stripe, not Razorpay.** `frontend/src/pages/booking/index.jsx` wrapped in `<Elements stripe={loadStripe('pk_test_placeholder')}>` and called `stripe.createPaymentMethod()` — a hardcoded placeholder key, never real, and the wrong vendor per CLAUDE.md (Razorpay for patient payments, Stripe reserved for tenant SaaS-subscription billing only). Confirmed via grep this was the *only* file in the whole frontend using any `@stripe/*` package — a contained, one-file bug, not a broader regression risk. Replaced with Razorpay's own Checkout widget; the now-fully-unused `@stripe/react-stripe-js`/`@stripe/stripe-js` packages were uninstalled.
2. **The existing `createPaymentTransaction` resolver wrote to the wrong table** — it shoved an `appointment_id` into `PaymentTransactions.metadata` (a JSON blob), a model explicitly scoped to `ClientOrganizations`/`OrganizationSubscriptions` with no `appointment_id`/`patient_id` columns at all. Removed; replaced by the real flow below against a new, correctly-shaped model.

## Scope

Real Razorpay payment **capture only** plus its one fixed, already-specified consumer (`manager/Dashboard.jsx`'s `getTransactionsByDate`, contract fixed by already-live frontend code per `context/open-questions.md` #1). Deferred to a second slice: `finances/index.jsx`'s full rewrite (100% mock today, no existing contract, and design-heavy — KPIs, revenue/expense chart, saved cards) and REQ004's still-open expense-tracking question (#3).

## Payment flow (Razorpay's documented client-integration pattern — no webhook)

Razorpay webhooks need a publicly reachable URL registered in their dashboard, unavailable for this local sandbox. Used Razorpay's **Payment Verification** pattern instead — real cryptographic HMAC-SHA256 verification server-side (`crypto.timingSafeEqual`, never a plain `===`, avoiding a timing side-channel), never trusting a client-reported "succeeded" state (`security-requirements.md` §5):

1. Patient books the appointment (existing `bookPatientAppointment`, unchanged).
2. `createRazorpayOrder(appointmentId)` (`@Public()`): amount derived **server-side** from the appointment's linked product price — never a client-supplied argument (the payment-flow analog of Hard Rule 6). Calls Razorpay's real Orders API via Node's built-in global `fetch` (Node 20 in the container — no new npm dependency needed for this one call). Creates a `pending` `AppointmentPayments` row.
3. Frontend loads Razorpay's `checkout.js`, opens `new window.Razorpay({...}).open()`.
4. On success, `verifyRazorpayPayment({razorpay_order_id, razorpay_payment_id, razorpay_signature})` recomputes and compares the HMAC — only on match does the row become `succeeded`.

## Schema

New `AppointmentPayments` model — separate from `PaymentTransactions` per REQ004's own lean, mirroring its GST field shape (no org-level GST-config table exists anywhere to source from automatically, so nullable-per-transaction matches the one precedent that does exist). Migration `20260820150000_appointment_payments`.

## Backend (`backend/src/appointment-payments/`)

`createRazorpayOrder`, `verifyRazorpayPayment` (both `@Public()`, matching the `public` module's convention for unauthenticated patient-flow operations), `getTransactionsByDate` (`@Auth('manager','admin','super_admin')`, tenant-scoped via `req.user.client_org_id`) — field shape matches `manager/Dashboard.jsx`'s `GET_MANAGER_TRANSACTIONS` exactly (camelCase, the public/patient-self-serve dialect, even though the rest of that page is canonical/snake_case — matched as already-live, not "fixed").

## Frontend (`frontend/src/pages/booking/index.jsx`)

Removed all Stripe imports/usage. Added a `checkout.js` script loader, rewrote `PaymentForm.handlePayAndBook` to the flow above, replaced the card-collection `CardElement` UI with an explanatory note (card/UPI details are entered on Razorpay's own screen, never this app's).

## Verification

See [TP042](../../../test-plans/patient-payments/requirement/TP042-patient-payments-2026-08-20-razorpay-capture.md) and [TR041](../../../test-results/patient-payments/requirement/TR041-patient-payments-2026-08-20-razorpay-capture.md).
