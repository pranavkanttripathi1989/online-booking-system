---
id: REQ112
type: improvement
feature: platform-integrations
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ030
related: [PLAN152, TP168, TR168]
---

# REQ112 — Webhook delivery retry with exponential backoff

## Why this slice

`REQ030` shipped signed outbound webhook delivery (`WebhookEndpoints`/
`WebhookDeliveryLog`, HMAC-SHA256) but deliberately deferred its own P1
acceptance criterion: retrying a failed delivery. Today
`WebhookDispatchService#deliverOne()` (`backend/src/webhooks/
webhook-dispatch.service.ts`) makes exactly one synchronous HTTP attempt
per subscribed endpoint per event and writes one `WebhookDeliveryLog` row
with `status: 'succeeded' | 'failed'` — a failure is visible (CLAUDE.md's
own live-verified account: booking a `prepayment_policy: 'required'`
service fired a real `appointment.created` webhook that logged `failed`
against a deliberately unreachable test endpoint) but never
auto-retried. A real customer's receiving endpoint having a few minutes
of downtime today means a permanently missed webhook with no recovery
path short of the org admin noticing via the existing "Delivery Log"
panel (`REQ060`'s A-8 slice) and asking MediBook support to manually
resend — there is no resend capability either.

No BullMQ (or any job-queue library) is actually installed in this
codebase — `package.json` has no `bullmq`/`@nestjs/bull` dependency,
despite `CLAUDE.md`'s Architecture section mentioning "Redis (BullMQ +
Pub/Sub)" in passing; Redis here is a plain `ioredis` client used for
rate-limiting/pub-sub only. Every existing deferred/scheduled-processing
need in this codebase (`LowStockSweepService`, `RetentionPurgeService`,
`PriceHistorySweepService`, `ScheduledReports`' `deliverDueReports`) uses
a `@Cron`-based sweep, not a queue library. This slice follows that
established convention rather than introducing a new infrastructure
dependency.

**A related, but out-of-scope, issue found during research**: the
integration test suite's `WebhookEndpoints` fixture
(`backend/test/integration/setup/fixture.ts`) stores a plaintext
`secret: 'fixture-secret-a'` directly, while `deliverOne()` calls
`decrypt(endpoint.secret)` expecting an AES-256-GCM-encrypted value (as
the real `webhooks.service.ts#create()` path always writes via
`encrypt()`). This is why the integration suite's own log shows `Failed
to decrypt secret for webhook endpoint ...: Invalid authentication tag
length: 0` on every run — a fixture bug, not a production bug (confirmed
the real create path always encrypts). Logging here for visibility;
fixing it is not part of this slice's scope.

## User story

As an org admin who has configured a webhook endpoint, when my receiving
server has a transient outage, I want MediBook to keep retrying the
delivery on a backoff schedule so I don't permanently lose the event,
and I want to see each attempt in the existing delivery log.

## Acceptance criteria

- **Given** a webhook delivery attempt fails (network error or non-2xx
  response), **when** the sweep next runs, **then** the same event is
  retried against the same endpoint, and a new `WebhookDeliveryLog` row
  records the new attempt (not a mutation of the old row — the log stays
  an append-only history, matching this codebase's existing append-only
  convention for `StockMovements`/`PriceHistory`).
- **Given** a delivery has failed 5 times, **when** the 6th scheduled
  retry would occur, **then** the endpoint's pending retry is marked
  `exhausted` and no further attempts are made automatically.
- **Given** a retry succeeds, **when** the sweep processes it, **then**
  the pending retry is marked `succeeded` and removed from future sweep
  consideration.
- **Given** two different orgs each have a failed delivery pending
  retry, **when** the sweep runs, **then** each org's `webhookDeliveryLog`
  read-back query (`deliveryLog(endpoint_id)`, already org-scoped via
  `isSameOrg`) only ever shows that org's own endpoint's attempts.
- **Given** an org admin views the existing "Delivery Log" dialog
  (`settings/index.jsx`'s Integrations tab, from `REQ060`'s A-8 slice),
  **when** a delivery has been retried, **then** every attempt (original
  + retries) appears in the list, most recent first, with a visible
  status per attempt.

## Scope

- New `attempt_number`, `next_retry_at` columns on `WebhookDeliveryLog`
  (nullable — only pending-retry rows populate `next_retry_at`); reuse
  the existing `status` string column, adding `'exhausted'` as a third
  value alongside the existing `'succeeded'`/`'failed'`.
- A `@Cron` sweep (`WebhookRetrySweepService`, matching the existing
  sweep-service naming convention) that finds `status: 'failed'` rows
  whose endpoint is still `is_active` and whose `next_retry_at <= now()`
  and have not yet reached the max-attempt cap, and retries them.
- Fixed backoff schedule: attempt 2 at +1 min, attempt 3 at +5 min,
  attempt 4 at +30 min, attempt 5 at +2 hr, attempt 6 (final) at +6 hr;
  after attempt 6 fails, mark `exhausted`. 5 total retries (6 attempts
  including the original), matching this being a best-effort notification
  channel, not a guaranteed-delivery system.
- The existing `deliveryLog` read-back query needs no contract change —
  it already returns every row for the endpoint; new rows from retries
  simply appear in the same list.

## Deliberately out of scope

- Fixing the integration-test fixture's plaintext-secret bug (noted
  above as a separate, real-but-small issue — not blocking this slice,
  should be its own tiny follow-up).
- A manual "resend now" button — a real, useful next step, but a
  separate UI-facing slice once the retry mechanism itself exists.
- Introducing BullMQ or any other queue library — the `@Cron` sweep
  matches this codebase's own established convention and avoids a new
  infrastructure dependency for a low-volume background job.
- Configurable per-org backoff schedules — a fixed schedule is
  sufficient for this slice; per-org tuning is unproven demand.
