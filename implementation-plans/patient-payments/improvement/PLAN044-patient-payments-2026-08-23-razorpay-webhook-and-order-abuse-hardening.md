---
id: PLAN044
type: improvement
feature: patient-payments
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ040
related: [REQ004]
---

# PLAN044 — Razorpay webhook, reconciliation job, and order-creation throttling

## Design

### 1. Webhook endpoint (new REST controller, not GraphQL)

`backend/src/appointment-payments/appointment-payments-webhook.controller.ts`,
`POST /webhooks/razorpay`. REST, not GraphQL, because Razorpay calls this
server-to-server with its own signed payload shape — there is no JWT to
authenticate, and no existing GraphQL mutation shape fits an
externally-defined webhook contract.

**The global `GqlAuthGuard`/`GqlThrottlerGuard` do not protect REST
routes** — confirmed from `account.controller.ts`'s own header comment:
`GqlAuthGuard.getRequest()` reads exclusively from
`GqlExecutionContext.create(context).getContext().req`, which is empty for
a plain HTTP context. This is fine here specifically because the webhook's
real authentication *is* the Razorpay signature check, done inside the
controller itself — the same shape as `account.controller.ts` doing its own
`JwtService.verify()` rather than relying on a guard that can't see it.

**Raw body**: Razorpay's webhook signature is an HMAC over the exact raw
request bytes, not the re-serialized parsed JSON (key order/whitespace
differences would break the HMAC). `main.ts`'s `NestFactory.create()` gets
`{ rawBody: true }`, Nest's built-in option that preserves `req.rawBody` as
a `Buffer` alongside the normal parsed body for every request — a small,
targeted addition rather than hand-rolling per-route raw-body middleware.

**Signature verification**: HMAC-SHA256 of `req.rawBody` using
`RAZORPAY_WEBHOOK_SECRET` (a *different* secret from `RAZORPAY_KEY_SECRET`
— that one signs the client-integration checksum
`verifyRazorpayPayment` already checks; conflating the two would be wrong
even though both are HMAC-SHA256), compared against the
`X-Razorpay-Signature` header via `crypto.timingSafeEqual`, matching the
existing constant-time-comparison pattern in `verifyRazorpayPayment`.

**Events handled**: `payment.captured` → mark the matching
`AppointmentPayments` row `succeeded` (idempotent: if already `succeeded`,
no-op); `payment.failed` → mark it `failed`, unless already `succeeded`
(a late failure notification for an already-reconciled success must not
regress the row). Every other event type is acknowledged (200, so Razorpay
doesn't retry) and ignored — refunds/disputes have no schema anywhere in
this codebase yet (logged as out of scope in `REQ040`, not silently
mishandled).

**Idempotency**: no new table. The underlying operation — set
`AppointmentPayments.status` to a specific value keyed by
`razorpay_order_id` — is naturally idempotent; applying the same webhook
delivery twice (Razorpay's own at-least-once retry policy) produces the
same end state. A dedicated event-dedup table would be solving a problem
this operation shape doesn't have.

**Audit trail**: every webhook call writes one `AuditLogs` row directly via
`prisma.auditLogs.create()` (`user_id: null`, `resource: 'appointment_payment'`,
`action: 'razorpay_webhook'`, `outcome: 'success'|'invalid_signature'|'ignored'`)
— the existing `AuditLogInterceptor` is GraphQL-context-only (same reason
the guards are), so a REST route logs directly rather than fighting that
interceptor's assumptions, the same shape as everything else being
REST-specific in this one controller.

### 2. Reconciliation job (new, `@nestjs/schedule`)

No cron/scheduling library existed anywhere in this codebase before this
slice (confirmed: no `@Cron`, no `ScheduleModule`, no BullMQ despite
`CLAUDE.md`'s aspirational mention of it — the real Redis usage is
rate-limiting and pub/sub, not queues). Added `@nestjs/schedule` (NestJS's
own official package, matching the framework already in use, not a new
architectural direction) rather than hand-rolling a `setInterval` loop.

`backend/src/appointment-payments/appointment-payments-reconciliation.service.ts`:
a single `@Cron('*/15 * * * *')` method. Queries `AppointmentPayments` where
`status = 'pending'` and `created_at` older than 20 minutes (a live Razorpay
Checkout session is good for far less than that — 20 minutes is a safety
margin, not a guess at Razorpay's own timeout). For each, calls Razorpay's
Orders API (`GET /v1/orders/{id}/payments`) and, if any returned payment has
`status: 'captured'`, marks the row `succeeded`; if the order itself is
`attempted`/`created` with no captured payment after this long, marks it
`failed` rather than leaving it pending forever. Every reconciliation
attempt writes an `AuditLogs` row (`action: 'razorpay_reconciliation'`) so a
human can see what the sweep actually did, not just that it ran.

### 3. Throttle the two currently-`@Public()` mutations

`createRazorpayOrder`/`verifyRazorpayPayment` (`appointment-payments.resolver.ts`)
get `@Throttle({ default: { limit: 10, ttl: 60_000 } })`, matching
`REQ038`'s own redesigned tier for "cost-bearing sends" (`requestOtp`/
`forgotPassword` got the same 10/60s). **Not** requiring authentication —
`booking/index.jsx`, the public booking wizard this session's own `BUG011`
fixed to work anonymously, calls `createRazorpayOrder` before the visitor
has ever authenticated. Auth-gating it would directly contradict that
already-made, already-tested decision. The abuse surface F-07 describes
(unbounded real vendor orders from a learned appointment UUID) is real but
is a rate problem, not an identity problem, given the deliberate
anonymous-booking architecture — so the fix is a rate limit, not an auth
requirement.

## What this deliberately does not do

- No refund/dispute webhook handling — no refund flow exists anywhere in
  this codebase yet (`REQ040`).
- No GST invoice generation triggered by webhook confirmation — no
  invoicing module exists (`REQ040`).
- Does not add a caller-identity check to `createRazorpayOrder` beyond the
  rate limit — see the throttling rationale above.
- Does not change `verifyRazorpayPayment`'s `@Public()` status — the
  checkout callback genuinely cannot carry a session token (same anonymous-
  booking constraint), matching F-07's own "keep it public only if the
  checkout callback genuinely cannot carry a token" allowance.

## Verification

Unit: webhook controller/service (valid signature → status update,
invalid signature → rejected + audit-logged, unknown event type →
acknowledged + ignored, already-`succeeded` row not regressed by a late
`payment.failed`), reconciliation service (captured payment found →
`succeeded`; no captured payment past the window → `failed`; still within
the window → left alone). Full backend suite green, `tsc --noEmit`/`eslint`
clean. Live: `curl` against `/webhooks/razorpay` with a real computed
HMAC and a tampered one; repeated `createRazorpayOrder` calls confirming
the throttle actually engages. See `TR070`.
