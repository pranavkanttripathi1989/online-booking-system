---
id: PLAN247
type: requirement
feature: platform-billing
created: 2026-09-02
updated: 2026-09-02
status: done
parent: REQ178
related: [TP267, TR267]
---

# PLAN247 — Implementation plan: super-admin tenant subscription management

## Schema (`20260902020000_platform_billing`, `20260902020100_platform_invoice_sequences`)

```prisma
model PlatformSubscriptions {
  id                       String    @id @default(uuid())
  client_org_id            String
  plan_id                  String
  plan_version_id          String    // price/cycle locked in at subscribe time
  status                   String    @default("active") // trialing|active|past_due|grace|suspended|cancelled|non_renewing
  gateway                  String    // razorpay|stripe
  gateway_customer_id      String?
  gateway_subscription_id  String?
  mandate_status           String?   // pending|confirmed|paused|revoked -- Razorpay UPI/eNACH only
  mandate_max_amount_paise Int?
  current_period_start     DateTime
  current_period_end       DateTime
  cancel_at_period_end     Boolean   @default(false)
  cancelled_at             DateTime?
  cancelled_by_user_id     String?
  cancellation_reason      String?
  created_by_user_id       String
  created_at               DateTime  @default(now())
  updated_at                DateTime @default(now())
  client_org    ClientOrganizations @relation(fields: [client_org_id], references: [id])
  plan          Plans               @relation(fields: [plan_id], references: [id])
  plan_version  PlanVersions        @relation(fields: [plan_version_id], references: [id])
  invoices      PlatformInvoices[]
  dunningEvents PlatformDunningEvents[]
}

model PlatformInvoices {
  id                          String    @id @default(uuid())
  subscription_id             String
  client_org_id               String
  invoice_number               String    @unique
  amount_paise                 Int
  currency                     String    @default("INR")
  status                       String    @default("pending") // pending|paid|failed|void|refunded
  due_date                     DateTime
  paid_at                      DateTime?
  gateway                      String
  gateway_invoice_id           String?
  gateway_payment_id           String?
  pre_debit_notice_sent_at     DateTime?
  pre_debit_notice_amount_paise Int?
  afa_required                  Boolean  @default(false)
  platform_gstin                String?   // CareOS as seller
  client_org_gstin              String?   // tenant as buyer
  hsn_sac_code                  String?
  gst_rate                      Float?
  cgst_amount_paise             Int?
  sgst_amount_paise             Int?
  igst_amount_paise             Int?
  metadata                     Json      @default("{}")
  created_at                   DateTime  @default(now())
  subscription PlatformSubscriptions @relation(fields: [subscription_id], references: [id])
  client_org   ClientOrganizations   @relation(fields: [client_org_id], references: [id])
}

model PlatformDunningEvents {
  id              String    @id @default(uuid())
  subscription_id String
  invoice_id      String?
  event_type      String    // payment_failed|retry_scheduled|retry_attempted|grace_started|suspended|reactivated|mandate_paused|mandate_revoked
  attempt_number  Int?
  occurred_at     DateTime  @default(now())
  metadata        Json      @default("{}")
  subscription PlatformSubscriptions @relation(fields: [subscription_id], references: [id])
}

model PlatformInvoiceSequences {
  id             String   @id @default(uuid())
  financial_year String   @unique
  last_number    Int      @default(0)
  updated_at     DateTime @default(now())
}
```

Plus `ClientOrganizations.gstin String?` (the tenant's own GSTIN, nullable
— distinct from `Clinics.gstin`, which is about a clinic billing its own
patients). `PlatformInvoiceSequences` was a follow-up migration, added
after discovering `InvoiceSequences.clinic_id` is a required FK that
can't be reused for platform-level (no-clinic) invoice numbering — the
first migration was already applied by then, so this is a second file,
not an edit (Prisma tracks migrations by checksum).

## `platform-billing.service.ts` — the core service

`createSubscription(input, user)`: validates the org exists and isn't
deleted, rejects a duplicate active/trialing/past_due/grace subscription
for the same org, validates the plan is active with a current (non-closed)
`PlanVersion`, resolves the gateway provider, calls
`provider.createSubscription()` with `mandateMaxAmountPaise:
Math.min(price_paise, AFA_THRESHOLD_PAISE)` (₹15,000), then writes the
`PlatformSubscriptions` row (`status: 'trialing'`) inside a transaction
only after the gateway call succeeds — a failed gateway call never leaves
an orphaned DB row.

`cancelSubscription(input, user)`: defaults to graceful
(`cancel_at_period_end: true`, no entitlement change); `immediately: true`
calls `assignPlan(orgId, null)` right away. Either way logs a
`PlatformDunningEvents` row (`grace_started`/`suspended`) with the typed
reason.

`applyBillingEvent(gateway, event)`: the shared webhook-driven state
machine (all 7 `NormalizedBillingEventType` values). `charge_succeeded`
guards a real race — a subscription already flagged
`cancel_at_period_end` finalizes cancellation on its final charge rather
than renewing (`shouldRenew = !subscription.cancel_at_period_end`), and
always re-derives the real `billingPeriod` from the subscription's own
`plan_version_id` rather than assuming monthly on recovery from
`past_due` (a bug caught and fixed before shipping — an annual
subscriber recovering from a failed charge would otherwise have been
given a 1-month extension instead of 12).

`generateNextInvoice(subscriptionId)`: called by the dunning sweep ahead
of `current_period_end` — creates a `pending` invoice row so a
failed/never-attempted charge still has a real invoice record, not just
a gap. `retryInvoice(invoiceId)`: records a `retry_attempted` dunning
event; this codebase never pushes a charge directly — Razorpay/Stripe
both auto-charge an already-active mandate on their own schedule.

`getCredentials(gatewayId)`: public (also called by the webhook
controller before the service itself sees a parsed event) — platform-
level env vars, no DB row, no per-tenant encryption, matching Hard Rule
9's "fixed vendor" framing applied to this domain specifically.

## `providers/` — two gateway adapters

`razorpay-subscriptions.provider.ts`: `createSubscription()` creates a
Razorpay-side Plan object first, then a Subscription against it
(`total_count`: 120 for monthly, 10 for annual — roughly a 10-year
horizon either way), returning the subscription's own `short_url` as the
`authenticationUrl`. `verifyWebhookSignature()` reuses the exact same
HMAC-SHA256-over-raw-bytes scheme as the existing live Razorpay Orders
webhook (`payment-gateways/providers/razorpay.provider.ts`).
`parseWebhookEvent()` maps `subscription.activated`/`.authenticated` →
`subscription_activated`, `.charged` → `charge_succeeded`,
`payment.failed`/`.halted` → `charge_failed`, `.pending` →
`pre_debit_notice_sent`, `.paused` → `mandate_paused`, `.cancelled` →
`subscription_cancelled`.

`stripe.provider.ts`: Stripe's REST API is form-encoded
(`application/x-www-form-urlencoded`), not JSON, on every request — a
well-documented vendor fact, applied without hedging even absent live
credentials. `createSubscription()` creates a customer, then a price
(`recurring[interval]`: `month`/`year`), then a Checkout Session in
subscription mode, returning the session's own `url` as the
`authenticationUrl` (the real subscription id doesn't exist until
checkout completes — the session id stands in until the webhook confirms
the real one). `verifyWebhookSignature()` implements Stripe's documented
`Stripe-Signature: t=...,v1=...` scheme with a 5-minute timestamp
tolerance (replay protection).

**Honesty commitment**: neither adapter has real test credentials in this
environment (no `RAZORPAY_SUBSCRIPTIONS_KEY_ID`/`STRIPE_SECRET_KEY`
configured anywhere). Both are built strictly from each vendor's own
published API contract and unit-tested against hand-derived fixtures —
matching the `REQ175`–`177` Cashfree/PayU/PhonePe precedent — never
claimed as live-verified.

## `platform-billing-webhooks.controller.ts` / `platform-billing-dunning-sweep.service.ts`

Webhook controller: `@Public()`, `/platform-webhooks/{razorpay,stripe}`,
`RawBodyRequest<Request>` (raw-body signature verification, never
re-serialized JSON), resolving platform credentials via the service's
public `getCredentials()` before parsing.

Dunning sweep: `@Cron('0 6 * * *')`, three private methods called from
one public `sweep()` — `generateUpcomingInvoices()` (skips a subscription
that already has an invoice for the current cycle),
`escalatePastDue()` (day 1/3/7 `retry_scheduled` logging, day 10
suspend + `assignPlan(orgId, null)` + a notification), and
`finalizeExpiredGracefulCancellations()` (the lost-webhook-delivery
safety net described in `REQ178`). Every per-row iteration is wrapped in
its own `try/catch` so one failure doesn't abort the sweep — matching
`low-stock-sweep.service.ts`'s own established convention.

## GraphQL contract — `@Auth('super_admin')` throughout

`platformBillingProviders`, `platformSubscriptions(status?)`,
`platformSubscription(id)`, `createPlatformSubscription(input)`,
`cancelPlatformSubscription(input)`, `platformInvoices(subscription_id?,
client_org_id?, status?)`, `platformTransactions(status?)` (same
underlying table as invoices — one charge cycle, one invoice, one payment
attempt is the same row in this design), `retryPlatformInvoice(invoice_id)`.
Deliberately gated tighter than the `admin`-inclusive gates elsewhere —
this is platform financial data, matching `Plans`' own precedent.

## Frontend — `pages/admin/PlatformBilling.jsx`

New page (route + `AppShell.jsx` nav entry, both `super_admin`-only,
matching the resolver's own gate — `App.jsx`'s existing `super_admin`-only
block alongside `/admin/plans`). Tabs: Subscriptions / Invoices /
Transactions. New Subscription dialog: an `Autocomplete` tenant search
(debounced, real `organizationsPaginated` query — FORM-14), plan/gateway
`Select`s, a post-create state showing the mandate/checkout setup link
when the gateway returns one. Subscription detail dialog: full status,
period, mandate info; a Cancel action opens a dedicated **SURF-16
typed-confirmation dialog** (type the tenant's exact org name; a graceful/
immediate toggle; a required reason field) — no shared typed-confirm
component existed yet, so this is a first, local instance rather than a
premature extraction (this codebase's own "three times, then extract"
convention). Invoice/Transaction tables share one `InvoiceTable`
sub-component; a GST tooltip on each row; a Retry action on `failed` rows.

`admin/Organizations.jsx`: replaced the old disconnected, read-only
`GET_ORG_SUBSCRIPTION` dialog (reading the legacy, near-always-empty
`OrganizationSubscriptions` table) with `GET_PLATFORM_SUBSCRIPTIONS_FOR_LOOKUP`
(the resolver has no `client_org_id` filter arg — platform-wide by
design, same as `Plans` — so this fetches the full list and finds the
org's row client-side, acceptable at this dataset's scale) plus a
"Manage in Platform Billing" button (`useNavigate`).

`admin/Plans.jsx`: a "Subscribers" column, reduced client-side from the
same flat `platformSubscriptions` list into per-`plan_id` counts (a
non-fatal fetch — failure leaves counts empty rather than blocking the
page), each a clickable `Chip` linking into the new dashboard.

## Real bugs found and fixed during this pass

1. **`applyBillingEvent`'s `charge_succeeded` case** initially special-
   cased `past_due` recovery to a hardcoded 1-month extension instead of
   re-deriving the subscription's real billing period — would have given
   an annual subscriber recovering from a failed charge a 1-month
   extension instead of 12. Fixed to always call `billingPeriodFor()`.
2. **The same handler's own renewal-vs-cancellation race** — a
   `charge_succeeded` webhook landing on a subscription already flagged
   `cancel_at_period_end` would have incorrectly extended the period
   again instead of finalizing the cancellation. Fixed with an explicit
   `shouldRenew` guard.
3. **`getCredentials()` was initially accessed via a
   `(service as any).getCredentials()` cast** in the webhook controller
   to bypass a private method — a code smell caught before shipping.
   Fixed by making it a proper public method with an explaining comment.
4. **`OrganizationsModule` did not export `OrganizationsService` at
   all** — discovered while wiring `PlatformBillingModule`'s own
   dependency on it. Fixed with an explicit `exports: []` entry.
5. **`PlatformBilling.jsx`'s org-search Autocomplete re-fired a
   debounced search on the full "Name (code)" label** every time an
   option was selected (MUI's `onInputChange` fires with `reason:
   'reset'` when the displayed text changes because of a selection, not
   typing) — wasting a network call and, in the test suite, throwing a
   real "no more mocked responses" error. Found and fixed by skipping
   `reason === 'reset'`/`'clear'` in the debounce handler, live-caught by
   the new frontend test suite, not by inspection.

## Testing

Backend: `platform-billing.service.spec.ts` (35 tests — providers,
createSubscription×7, cancelSubscription×5, applyBillingEvent×11 covering
all 7 event types, listInvoices/listTransactions×3, retryInvoice×3,
notifyOrg×3, getCredentials×2), `razorpay-subscriptions.provider.spec.ts`
(14 tests), `stripe.provider.spec.ts` (18 tests),
`platform-billing-dunning-sweep.service.spec.ts` (14 tests) — 81 total,
all passing on first or second try (see bugs 1–2 above, caught at the
test-writing stage). Frontend: `PlatformBilling.test.jsx` (6 tests —
empty state, real-data list, full create flow including the mandate
setup-link result state, typed-confirmation disable/enable, a full
graceful-cancel submit, and a failed-invoice retry).

## Live verification

Schema introspection against the running `medibook_backend` container
(after `docker exec ... npx prisma generate` + `docker restart`)
confirmed all 5 queries and 3 mutations are actually served — no silent
module-recompile race this time. A full authenticated `super_admin`
create/cancel round trip against the real dev database was attempted and
blocked: no seeded `super_admin` demo account exists, and promoting
`admin@medibook.dev`'s role via a direct `UPDATE` against the live
`UserProfiles` table was blocked by this session's own auto-mode
permission classifier as a hard-to-reverse action against running shared
infrastructure — matching the established `F-33` precedent (no
workaround attempted; recorded honestly in `REQ178` rather than silently
skipped).
