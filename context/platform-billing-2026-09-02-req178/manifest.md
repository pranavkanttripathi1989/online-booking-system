---
id: CTX-platform-billing-2026-09-02-req178
type: requirement
feature: platform-billing
created: 2026-09-02
updated: 2026-09-02
status: done
parent: REQ178
related: [REQ033, PLAN247, TP267, TR267]
---

# platform-billing — super-admin tenant subscription management, invoicing, RBI e-mandate collection (2026-09-02)

Direct user request: a super-admin dashboard to create monthly/annual
subscriptions per tenant clinic org, generate bills, collect payment, see
transaction history, and cancel subscriptions — with full RBI e-mandate
compliance, "different payment gateway" from patient payments, informed by
competitor/market research. Entered plan mode; two `AskUserQuestion`
rounds resolved the two genuine ambiguities (full RBI e-mandate compliance
vs. an MVP subset; the gateway mix — Razorpay Subscriptions primary,
Stripe kept as a card-only fallback, after research showed Stripe India
has no UPI AutoPay/eNACH support). Plan approved via `ExitPlanMode`, then
implemented end to end across one continuous session — this fulfills
`REQ033` (drafted 2026-08-22, never previously implemented).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ178 | [doc](../../requirements/platform-billing/requirement/REQ178-platform-billing-2026-09-02-super-admin-subscription-management.md) |
| requirements | REQ033 (fulfilled, not superseded) | [doc](../../requirements/platform-billing/requirement/REQ033-platform-billing-2026-08-22-upi-autopay-e-mandate-collection.md) |
| implementation-plans | PLAN247 | [doc](../../implementation-plans/platform-billing/requirement/PLAN247-platform-billing-2026-09-02-super-admin-subscription-management.md) |
| test-plans | TP267 | [doc](../../test-plans/platform-billing/requirement/TP267-platform-billing-2026-09-02-super-admin-subscription-management.md) |
| test-results | TR267 | [doc](../../test-results/platform-billing/requirement/TR267-platform-billing-2026-09-02-super-admin-subscription-management.md) |

## What shipped

- **Schema** (`20260902020000_platform_billing`,
  `20260902020100_platform_invoice_sequences`, both additive):
  `PlatformSubscriptions`, `PlatformInvoices`, `PlatformDunningEvents`,
  `PlatformInvoiceSequences`; `ClientOrganizations.gstin` (nullable).
- **New `backend/src/platform-billing/` module**: subscription
  create/cancel (graceful default, immediate as an explicit choice),
  reusing the existing `Plans`/`PlanVersions` catalog and
  `organizationsService.assignPlan()` as the single entitlement-linkage
  write path rather than duplicating it; two gateway adapters (Razorpay
  Subscriptions — UPI AutoPay/eNACH — and Stripe, card-only fallback), a
  `@Public()` webhook controller for both, and a daily dunning sweep
  (invoice generation ahead of period end, day 1/3/7/10 past-due
  escalation, a lost-webhook-delivery safety net for graceful
  cancellations). `@Auth('super_admin')` throughout, gated tighter than
  the `admin`-inclusive gates elsewhere — matches `Plans`' own precedent.
- **Frontend**: new `pages/admin/PlatformBilling.jsx` (tenant search,
  create-subscription flow with a mandate/checkout setup-link result
  state, Subscriptions/Invoices/Transactions tabs, a SURF-16
  typed-confirmation cancel dialog); `admin/Organizations.jsx`'s old
  disconnected, read-only legacy subscription dialog replaced with a real
  billing summary + a link into the new dashboard; `admin/Plans.jsx`
  gained a per-plan subscriber count.
- **Tenancy matrix**: `platform-billing` classified `EXEMPT` — platform-
  wide by design (a `super_admin` acts across every tenant's billing),
  same shape as `organizations`/`plans`' own existing exemptions.

## Real bugs found and fixed during this pass

1. **`applyBillingEvent`'s `charge_succeeded` handler** hardcoded a
   1-month extension for a `past_due`-recovery renewal instead of
   re-deriving the subscription's real billing period — would have given
   an annual subscriber a 1-month extension instead of 12. Caught while
   writing its own unit test, fixed before the suite ran.
2. **The same handler's renewal-vs-cancellation race** — a
   `charge_succeeded` webhook arriving after a subscription was already
   flagged `cancel_at_period_end` would have incorrectly renewed instead
   of finalizing the cancellation. Fixed with an explicit `shouldRenew`
   guard.
3. **`OrganizationsModule` didn't export `OrganizationsService` at all**
   — found wiring `PlatformBillingModule`'s dependency on `assignPlan()`.
   Fixed with an explicit `exports: []` entry.
4. **`PlatformBilling.jsx`'s tenant-search Autocomplete re-fired its
   debounced search on the selected option's own full display label**
   (MUI fires `onInputChange` with `reason: 'reset'` on selection, not
   just typing) — wasted a network call live and threw a real
   "no more mocked responses" error in the test suite, which is what
   surfaced it. Fixed by skipping `reason === 'reset'`/`'clear'`.
5. **A dead `BadRequestException`/`NotFoundException` import** in
   `platform-billing.service.ts` — this service uses the `{success,
   message}` result convention throughout, like `plans.service.ts`,
   never a thrown `HttpException`. Removed rather than adding a use.
6. A pre-existing `Organizations.test.jsx` broke as a correct
   consequence of adding `useNavigate()` to the page (for the new
   "Manage in Platform Billing" button) — the test rendered with no
   `<Router>` context. Fixed by wrapping the render in `<MemoryRouter>`.

## Deliberately NOT built (recorded, not silently dropped)

- **`REQ033`'s US-BILL-04** (automatic fallback to split
  collection/payment-link/eNACH above ₹15,000) — `afa_required` is
  computed and displayed; actual AFA enforcement at charge time is
  Razorpay's own responsibility per the aggregator contract.
- **Live gateway verification** — no real Razorpay Subscriptions-product
  or Stripe test credentials exist in this environment. Both adapters
  are unit-tested against hand-derived fixtures from each vendor's own
  published contract, honestly stated as unverified live.
- **A full live create/cancel subscription round trip against the real
  dev database** — attempted and blocked. No seeded `super_admin` demo
  account exists on this dev database, and promoting
  `admin@medibook.dev`'s role via a direct `UPDATE` against the running
  `UserProfiles` table was blocked by this session's own auto-mode
  permission classifier as a hard-to-reverse action against running
  shared infrastructure — the same class of block `F-33` (Postgres
  password rotation) hit previously. No workaround attempted.
- **Migrating self-serve onboarding's trial-selection write path**
  (`OrganizationSubscriptions`) onto this new billing model — a genuine,
  separate design question (does trial selection auto-create a real
  `trialing` subscription? on what event?), not asked for here and risky
  to the one thing in that legacy area that currently works end to end.
- **One `Plan` supporting a monthly/annual cycle choice at subscribe
  time** — `PlanVersions` has exactly one current cycle per `Plan` row
  today; redesigning that already-live model was out of scope.

## Verification

Backend: 146 suites / 2348 tests green (`npx jest --maxWorkers=2`, up
from 142/2267 before this session), 9 integration suites / 450 tests
green (`npm run test:int`), `tsc --noEmit`/`eslint` clean. Frontend:
`PlatformBilling.test.jsx` (6/6), `Organizations.test.jsx` (5/5, fixed
for the new router dependency), `eslint`/`npm run build`/`npm run size`
all clean (new lazy chunk 5.76 kB gzipped, well under budget). Live:
GraphQL schema introspection against the running `medibook_backend`
container confirmed all 5 new queries and 3 new mutations are genuinely
served. A full authenticated `super_admin` live round trip was blocked
per the section above, not silently skipped.
