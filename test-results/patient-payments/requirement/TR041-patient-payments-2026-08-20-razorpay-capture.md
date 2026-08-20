---
id: TR041
type: requirement
feature: patient-payments
created: 2026-08-20
updated: 2026-08-20
status: passed
parent: REQ004
related: [PLAN012, TP042]
---

# Test result — Real Razorpay payment capture (REQ004/PLAN012/TP042)

**Outcome: PASS.** Committed together with this document — see `git log` for the exact commit SHA.

## Unit tests

`docker exec medibook_backend npx jest appointment-payments` — 12/12 passed, including the security-critical tampered-signature and replay-against-a-different-payment rejection cases.

Full backend regression: `docker exec medibook_backend npm test` — **42 suites / 458 tests, all green** — confirms removing `createPaymentTransaction`/`PaymentTransactionInput`/`PaymentTransactionResultType` from `backend/src/public` broke nothing (`public.service.spec.ts` still green, no stale test referenced the removed method).

`docker exec medibook_backend npm run lint` — clean.

## Live verification against Razorpay's real sandbox

All 4 items from TP042's live-verification section executed and passed, including an *independent* confirmation step: after calling our own `createRazorpayOrder`, a separate direct `curl -u <key_id>:<key_secret> https://api.razorpay.com/v1/orders/<id>` call to Razorpay's own API confirmed the order genuinely exists there with the exact amount/receipt we expected — not just trusting our own resolver's echoed-back response.

## Browser e2e (Playwright)

`npx playwright test e2e/booking-payment.spec.js` — **1/1 passed**: real wizard walkthrough → real appointment booked → real `createRazorpayOrder` call → Razorpay's real `checkout.js` widget mounted a `razorpay`-sourced iframe in the browser. `npx playwright test e2e/public-booking.spec.js` (adjacent, same booking-flow area) — **2/2 still passed**, confirming no regression.

## Frontend build sanity

`eslint` still can't run in the `medibook_frontend` container (same pre-existing, unrelated environment issue noted in TR039/TR040). Verified `booking/index.jsx` transforms cleanly via forced Vite dev-server requests (HTTP 200) both before and after `@stripe/react-stripe-js`/`@stripe/stripe-js` were uninstalled and the container restarted (`Re-optimizing dependencies because lockfile has changed` — clean re-optimization, no errors).

## What was NOT automated, and why

Completing an actual sandbox payment inside Razorpay's own Checkout iframe (entering a real Razorpay test card/UPI id and confirming) is not automatable headlessly — it's a third-party widget outside this app's DOM. This is a manual verification step for a human to run once, not a silently-skipped part of the test suite. Everything up to and including that point (order creation against Razorpay's real API, widget mounting, HMAC verification logic on both success and tamper paths) is fully automated and passing.

## Scope note

This closes REQ004's payment-**capture** scope only. `finances/index.jsx`'s rewrite and the expense-tracking open question remain a second, not-yet-started slice.
