---
id: CTX-platform-integrations-2026-08-26-req112
type: improvement
feature: platform-integrations
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ112
related: [PLAN152, TP168, TR168]
---

# platform-integrations — REQ112: webhook delivery retry with backoff (2026-08-26)

Slice of the reconciled 14-slice batch (`project-plans/analysis/10-next-14-slice-batch-reconciled.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ112 | [webhook retry with backoff](../../requirements/platform-integrations/improvement/REQ112-platform-integrations-2026-08-26-webhook-retry-backoff.md) |
| implementation-plans | PLAN152 | [implementation plan](../../implementation-plans/platform-integrations/improvement/PLAN152-platform-integrations-2026-08-26-webhook-retry-backoff.md) |
| test-plans | TP168 | [verification plan](../../test-plans/platform-integrations/improvement/TP168-platform-integrations-2026-08-26-webhook-retry-backoff.md) |
| test-results | TR168 | [verification results — pass](../../test-results/platform-integrations/improvement/TR168-platform-integrations-2026-08-26-webhook-retry-backoff.md) |

## What shipped

`REQ030` shipped signed webhook delivery but deliberately deferred
retry. New `WebhookDeliveryLog.attempt_number`/`next_retry_at` columns.
`WebhookDispatchService` now schedules a retry on failure (fixed
backoff: 1m/5m/30m/2h/6h across 5 retries, `'exhausted'` after); new
`WebhookRetrySweepService` (`@Cron` every minute, matching this
codebase's existing sweep-service convention rather than introducing a
queue library — none is installed here despite CLAUDE.md's Architecture
section mentioning BullMQ in passing).

## A real pre-existing bug found and fixed

The Delivery Log dialog's status chip compared `status === 'success'`
— the real values have always been `'succeeded'`/`'failed'`, so this
condition never matched and every delivery (including real successes)
has rendered as a red error chip since the feature shipped (`REQ060`'s
A-8). Fixed, with a regression test.

## Verification

3/3 backend suites, 15/15 tests, `tsc --noEmit` clean. Frontend 0 lint
errors, 5/5 tests passing (1 new). Full backend suite re-confirmed clean.
