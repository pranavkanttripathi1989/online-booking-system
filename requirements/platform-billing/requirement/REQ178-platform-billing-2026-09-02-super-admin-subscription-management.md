---
id: REQ178
type: requirement
feature: platform-billing
created: 2026-09-02
updated: 2026-09-02
status: done
parent: REQ033
related: [REQ033, REQ032, REQ175, REQ176, REQ177]
---

# Super-admin tenant subscription management: create/cancel, invoicing, RBI-compliant recurring collection

## Source

Direct user request: "I need super admin dashboard where I can create
subscription monthly or annually for different tenant create bill, see the
transactions etc — analyze the competitor and create a detailed
requirements and technical implementation plan, cancel the subscription,
check the transaction — it should be different payment gateway — analyze
the market and give me best solution." Fulfills `REQ033` (drafted
2026-08-22, never implemented) with a materially different — and more
concrete — technical shape, arrived at via two `AskUserQuestion` rounds:
the user selected **full RBI e-mandate compliance** (not an MVP subset),
and **Razorpay Subscriptions primary, Stripe as a card-only fallback**
(a distinct gateway from patient payments, per the user's own explicit
ask), after being shown that Stripe India has no native UPI AutoPay/eNACH
support.

## Current state (before this requirement)

No tenant billing/payment-collection code existed anywhere in this
codebase. `Plans`/`PlanVersions` (`REQ032`/`REQ147`) already provided a
real, versioned, super_admin-managed plan catalog with
`billing_period`/`price_paise`, and `organizations.service.ts#assignPlan()`
was the only existing write path to `ClientOrganizations.plan_id` — purely
manual, zero billing involved. A separate, mostly-dead legacy trio
(`SubscriptionPlans`/`OrganizationSubscriptions`/`PaymentTransactions`)
existed from self-serve onboarding's trial-selection write path
(`organization-onboarding.service.ts#selectPlan()`), read back only by
`admin/Organizations.jsx`'s own disconnected, read-only "Subscription"
dialog — most real orgs had no row there at all.

## What this ships

New `platform-billing` backend module (`backend/src/platform-billing/`),
genuinely separate from the per-clinic `payment-gateways` module patient
payments already use (`REQ175`–`177`): ONE platform-level credential set
per gateway from env vars (`RAZORPAY_SUBSCRIPTIONS_KEY_ID/SECRET/
WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`), never
per-tenant — matching Hard Rule 9's "fixed vendor" framing for this domain.

- **Subscription lifecycle** — `createPlatformSubscription`/
  `cancelPlatformSubscription`, `@Auth('super_admin')` throughout. Creating
  a subscription locks in the *current* `PlanVersion`'s id (not just the
  parent `Plan`'s), so a later plan-catalog price edit never retroactively
  changes an existing subscriber's committed price. Status lifecycle
  `trialing → active → past_due → grace → suspended → cancelled`, plus
  `cancel_at_period_end` for a graceful cancel. **Entitlement/billing
  unification**: the lifecycle drives the *existing*
  `organizationsService.assignPlan()` automatically on every relevant
  transition (`active`/`grace` → keep entitlements; `suspended`/
  `cancelled` → revoke) — never a duplicated write path. A manual
  `assignOrgPlan` override still works independently (comp/override path).
- **Two gateway adapters** (`providers/razorpay-subscriptions.provider.ts`,
  `providers/stripe.provider.ts`) implementing one shared
  `PlatformBillingProvider` interface — `createSubscription`,
  `cancelSubscription` (graceful vs. immediate), `verifyWebhookSignature`
  (raw bytes, never re-serialized JSON — matches the existing hard rule),
  `parseWebhookEvent`. Razorpay follows its own `Customer → Order(mandate)
  → Authorization payment` sequence (UPI AutoPay confirms in real time,
  eNACH bank mandates take 2 days–2 weeks); Stripe uses Checkout Sessions
  in subscription mode (card-only, no UPI/eNACH — confirmed via research,
  not assumed).
- **Invoicing with dual-GSTIN support** — `PlatformInvoices` records BOTH
  `platform_gstin` (CareOS as seller, from a `PLATFORM_GSTIN` env var) and
  `client_org_gstin` (the tenant as buyer, a new nullable
  `ClientOrganizations.gstin` column) — a genuinely different GST direction
  from the existing `AppointmentPayments` shape (one `gstin` = the seller),
  since here CareOS is the seller and the tenant is the buyer claiming
  input tax credit. `afa_required` is computed and stored per invoice
  (amount > ₹15,000, the RBI AFA threshold) for display; Razorpay itself
  enforces AFA at charge time.
- **RBI-compliance surfaces**: `pre_debit_notice_sent_at`/
  `_amount_paise` on `PlatformInvoices` records the mandatory 24-hour
  pre-debit-notice audit trail (populated from Razorpay's own webhook,
  which fires the notice on its own schedule — this codebase does not
  compute the 24h timing itself); mandate pause/cancel is a real tenant
  right honoured by both `cancelSubscription`'s gateway call and the
  tenant's own ability to revoke a UPI mandate directly from their UPI
  app (out of this codebase's control, by design — RBI mandates it stay
  that way).
- **Daily dunning sweep** (`platform-billing-dunning-sweep.service.ts`,
  `@Cron`) — generates the next cycle's invoice `INVOICE_LEAD_DAYS` (3)
  ahead of `current_period_end`; escalates a `past_due` subscription on a
  day 1/3/7 retry-logged cadence, suspending (revoking entitlements) at
  day 10 (`SUSPEND_AFTER_DAYS`) with no recovering `charge_succeeded`
  event — this cadence is this slice's own chosen default, not a cited
  regulatory requirement, flagged for product sign-off once real usage
  exists; finalizes a graceful cancellation whose gateway confirmation
  webhook never arrived (a lost-delivery safety net, distinct from the
  race `applyBillingEvent` itself already guards — a `charge_succeeded`
  landing on a `cancel_at_period_end` subscription finalizes cleanly
  rather than renewing).
- **Frontend** — new `pages/admin/PlatformBilling.jsx` (`super_admin`
  only, route+nav gated to match the resolver's own `@Auth`): tenant
  Autocomplete search, plan/gateway selection, a setup-link result state
  after create; Subscriptions/Invoices/Transactions tabs; a
  **SURF-16 typed-confirmation cancel dialog** (type the tenant's exact
  org name to confirm — this is a cross-tenant destructive action).
  `admin/Organizations.jsx`'s old disconnected, read-only "Subscription"
  dialog is replaced with a real `platform_billing` summary plus a link
  into the new dashboard. `admin/Plans.jsx` gains a per-plan subscriber
  count.

## Deliberately NOT built (recorded, not silently dropped)

- **`REQ033`'s US-BILL-04** (automatic fallback to split
  collection/payment-link/eNACH above ₹15,000) — `afa_required` is
  computed and surfaced for display, but this codebase does not itself
  orchestrate a fallback collection method; AFA enforcement at charge time
  is Razorpay's own responsibility per the aggregator contract, matching
  `REQ033`'s own non-functional note that compliance responsibility is
  shared between aggregator and merchant, not assumed to sit entirely with
  the vendor.
- **A separate `PaymentMandates`/`PreDebitNotifications` table**, as
  `REQ033`'s own original sketch proposed — folded into
  `PlatformSubscriptions.mandate_status`/`mandate_max_amount_paise` and
  `PlatformInvoices.pre_debit_notice_sent_at`/`_amount_paise` instead,
  since both are a true 1:1 relationship per subscription/invoice, matching
  `AppointmentPayments`' own established precedent of inlining GST/status
  fields rather than a join table.
- **Live gateway verification** — no real Razorpay Subscriptions-product
  or Stripe test credentials exist in this environment. Both adapters are
  built strictly from each vendor's own published API contract and
  unit-tested against hand-derived fixtures, stated plainly as unverified
  live, never claimed as proven — matching this codebase's established
  convention from the `REQ175`–`177` gateway adapters (Cashfree/PayU/
  PhonePe).
- **A full live create/cancel subscription round trip against the real
  dev database** — blocked mid-session: the only path to a `super_admin`
  session on this dev database was a direct `UPDATE` against the live
  `UserProfiles.role_id` (no seeded `super_admin` demo account exists;
  the seeded `admin@medibook.dev` carries `admin`, not `super_admin`).
  This session's own auto-mode permission classifier blocked that
  mutation as a hard-to-reverse action against running shared
  infrastructure — the same class of block `F-33` (default Postgres
  password rotation) hit in an earlier session. No workaround was
  attempted; live verification instead relied on schema introspection
  against the running container (confirming all 5 queries and 3
  mutations are actually served) plus the full automated suite below.
  Still open, pending explicit sign-off on either a seeded `super_admin`
  demo account or an explicit one-off approval to promote a test account.
- **Migrating self-serve onboarding's trial-selection write path
  (`OrganizationSubscriptions`) onto this new model** — a real, separate
  piece of work (does a trial-selecting tenant automatically get a real
  `trialing`-status `PlatformSubscription`? on what event?) not asked for
  here and risky to the one thing in that area that currently works
  end-to-end. Logged as an open question, not silently dropped.
- **One plan supporting a monthly/annual cycle choice at subscribe time**
  — `PlanVersions` has exactly one current cycle per `Plan` row
  (`createPlanVersion` closes the prior version), so a monthly and an
  annual option for the same tier are two separate `Plan` rows today.
  Redesigning that already-live, tested model for a nice-to-have is out
  of scope here.

## Acceptance criteria

**US-PLT-01**: As a super_admin, I can create a monthly or annual
subscription for a tenant against a real plan.
- Given an active plan with a current version and a real, non-deleted
  tenant org with no existing active/trialing/past_due/grace subscription,
  when I submit `createPlatformSubscription`, then a `trialing`-status
  `PlatformSubscriptions` row is created locking in that plan version's
  own id and price, and a setup link is returned when the gateway
  provides one.
- Given the org already has an active subscription, when I submit the
  same mutation, then it's rejected with a clear message and no duplicate
  row is created.

**US-PLT-02**: As a super_admin, I can cancel a subscription gracefully
(default) or immediately, with a typed confirmation.
- Given a graceful cancel (`immediately: false`), when confirmed, then
  `cancel_at_period_end` is set and entitlements are untouched until the
  period actually ends.
- Given an immediate cancel, when confirmed, then the subscription is
  marked `cancelled` right away and entitlements are revoked immediately
  via `assignPlan(orgId, null)`.
- Given the UI's typed-confirmation field does not exactly match the
  tenant's org name, then the Confirm action stays disabled.

**US-PLT-03**: As a super_admin, I can see invoices and cross-org
transactions, including GST and AFA details, and manually retry a failed
one.
- Given a failed invoice, when I click Retry, then a
  `PlatformDunningEvents` row records the manual attempt (the gateway's
  own mandate resolves the actual charge on its own schedule — this
  codebase never pushes a charge directly).

**US-PLT-04**: As the system, a subscription's real billing status stays
in sync with the tenant's actual entitlements without a duplicated write
path.
- Given a `subscription_activated`/`charge_succeeded` webhook, when
  applied, then `organizationsService.assignPlan()` is called with the
  subscription's own `plan_id` — never a re-derived write.
- Given a `charge_succeeded` event lands on a subscription already flagged
  `cancel_at_period_end`, then it finalizes the cancellation rather than
  renewing for another period (a real race the service guards explicitly).

## Data model impact

Three new tables (`PlatformSubscriptions`, `PlatformInvoices`,
`PlatformDunningEvents`), plus `PlatformInvoiceSequences` (platform-level
invoice numbering, analogous to the existing per-clinic
`InvoiceSequences`) and one new nullable `ClientOrganizations.gstin`
column. See `PLAN247` for full field lists and the migration files.

## Verification

Backend: 81 new unit tests (`platform-billing.service.spec.ts`,
`razorpay-subscriptions.provider.spec.ts`, `stripe.provider.spec.ts`,
`platform-billing-dunning-sweep.service.spec.ts`) — full suite 146
suites/2348 tests, integration 9 suites/450 tests, `tsc --noEmit`/`eslint`
clean. Tenancy matrix: classified `EXEMPT` (platform-wide by design,
`super_admin` acts across every tenant — same shape as `organizations`/
`plans`' own exemptions). Frontend: `PlatformBilling.test.jsx` (6 tests,
found and fixed one real bug along the way — see `TR267`), lint clean
(0 errors), build green, `size-limit` within budget (new lazy chunk 5.76
kB gzipped). Live: schema introspection against the running container
confirmed all 5 queries and 3 mutations are served; full
super_admin-authenticated live create/cancel round trip blocked per the
"Deliberately NOT built" section above.
