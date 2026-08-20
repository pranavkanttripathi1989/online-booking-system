---
id: TP042
type: requirement
feature: patient-payments
created: 2026-08-20
updated: 2026-08-20
status: approved
parent: REQ004
related: [PLAN012]
---

# Test plan — Real Razorpay payment capture (REQ004/PLAN012)

## Unit tests (`backend/src/appointment-payments/appointment-payments.service.spec.ts`, 12 cases)

`createRazorpayOrder`: rejects a nonexistent appointment without calling Razorpay; rejects an appointment with no priced product rather than defaulting to a fabricated amount; derives the order amount from the appointment's actual product price, never a client-supplied value; stamps `client_org_id` from the appointment's clinic and creates a `pending` row; surfaces a real Razorpay API error rather than silently creating a fake order.

`verifyRazorpayPayment`: accepts a correctly-computed HMAC signature and marks the payment `succeeded`; rejects a tampered signature (wrong secret) and marks `failed`, not `succeeded`; rejects a signature computed for a *different* payment_id (replay-against-a-different-payment case); rejects when no matching pending order exists.

`getTransactionsByDate`: scopes to the caller's own org for a manager; does not scope for a platform-wide caller; converts `amount` to rupees and matches `manager/Dashboard.jsx`'s exact camelCase field shape (`createdAt`, `appointment.clinician.name`, `appointment.patient.firstName/lastName`, `appointment.product.name`).

## Live verification against Razorpay's real sandbox (not mocked)

1. Created 4 real orders via `createRazorpayOrder` against real seeded appointments — independently confirmed each exists in Razorpay's own system via a direct `GET /v1/orders/{id}` call (not just trusting our own resolver's response): amount, currency, and `receipt` (the appointment id) all matched exactly.
2. Hand-computed a valid HMAC signature (Razorpay's own documented algorithm) for one real order and called `verifyRazorpayPayment` — succeeded, row transitioned `pending` → `succeeded`.
3. Called `verifyRazorpayPayment` with a garbage signature for a second real order — rejected, row transitioned `pending` → `failed`.
4. `getTransactionsByDate` reflects all 4 rows correctly (2 pending, 1 succeeded, 1 failed), amounts converted to rupees (49900 paise → ₹499), all nested fields (clinician/patient/product names) rendering correctly.
5. Tenant-scoping for `getTransactionsByDate` verified via unit tests only for this slice (the same org-scoping pattern already live-verified 3 times earlier this session for cancellation-rules, account, and org-settings — considered sufficiently proven without a redundant live cross-tenant check requiring a second seeded org's manager account, which doesn't exist in seed data).

## Browser e2e (Playwright, `frontend/e2e/booking-payment.spec.js`)

Full real wizard walkthrough (select slot → patient details → choose service → review & pay) against a real seeded clinician, ending in a real `createRazorpayOrder` call and confirming Razorpay's actual `checkout.js` widget mounts its iframe in the browser. Completing an actual test payment inside Razorpay's own iframe is **not automated** — it's a third-party widget requiring real test-mode card/UPI input, explicitly called out here rather than silently skipped; that step is manual.

Confirmed no regression on the adjacent `public-booking.spec.js` (same booking-flow area).

## Non-goals for this plan

`finances/index.jsx`'s full rewrite, REQ004's expense-tracking open question (#3), saved payment methods/tokenization, invoice line items, in-clinic terminals, and a real webhook endpoint (needs a publicly reachable URL not available in this local sandbox) — all explicitly deferred, not guessed at.
