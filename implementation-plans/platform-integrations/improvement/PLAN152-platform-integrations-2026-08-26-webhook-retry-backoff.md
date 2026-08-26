---
id: PLAN152
type: improvement
feature: platform-integrations
created: 2026-08-26
updated: 2026-08-26
status: in-progress
parent: REQ112
related: []
---

# PLAN152 — Webhook delivery retry with exponential backoff

## Schema change

`backend/prisma/schema.prisma`, `WebhookDeliveryLog` model — add two
nullable columns:

```prisma
model WebhookDeliveryLog {
  id            String   @id @default(uuid())
  endpoint_id   String
  event_type    String
  payload_json  Json
  // succeeded | failed | exhausted
  status        String
  http_status   Int?
  attempted_at  DateTime @default(now())
  response_snippet String?
  // New: retry tracking. attempt_number is 1 for the original synchronous
  // attempt, 2-6 for sweep-driven retries. next_retry_at is set only on a
  // 'failed' row that still has retries remaining — the sweep's own where
  // clause; null once a row is 'succeeded' or 'exhausted'.
  attempt_number Int      @default(1)
  next_retry_at  DateTime?

  endpoint WebhookEndpoints @relation(fields: [endpoint_id], references: [id])

  @@index([endpoint_id, attempted_at])
  @@index([status, next_retry_at])
}
```

Second index is new and load-bearing — the sweep's own query filters on
exactly `(status, next_retry_at)`; per F-13's own indexing convention,
lead with the equality column (`status`) and put the range/sort column
(`next_retry_at`) last.

Hand-written migration file: `backend/prisma/migrations/
<timestamp>_webhook_delivery_retry/migration.sql` —
`ALTER TABLE "WebhookDeliveryLog" ADD COLUMN "attempt_number" INTEGER NOT NULL DEFAULT 1;`,
`ALTER TABLE "WebhookDeliveryLog" ADD COLUMN "next_retry_at" TIMESTAMP(3);`,
`CREATE INDEX "WebhookDeliveryLog_status_next_retry_at_idx" ON "WebhookDeliveryLog"("status", "next_retry_at");`
— no backfill needed (existing rows default `attempt_number` to 1,
`next_retry_at` stays null, which correctly excludes them from the
sweep).

## Service changes

**`backend/src/webhooks/webhook-dispatch.service.ts`**:

- `deliverOne()` gains an optional `attemptNumber = 1` parameter. On
  failure (both the non-2xx branch and the catch block), instead of
  always writing `status: 'failed'` with no retry columns, compute:
  ```ts
  const BACKOFF_MINUTES = [1, 5, 30, 120, 360]; // attempt 2..6
  const nextDelay = BACKOFF_MINUTES[attemptNumber - 1]; // attemptNumber is the attempt that just failed
  const exhausted = attemptNumber >= 6;
  await this.prisma.webhookDeliveryLog.create({
    data: {
      endpoint_id: endpoint.id,
      event_type: eventType,
      payload_json: payload as Prisma.InputJsonValue,
      status: exhausted ? 'exhausted' : 'failed',
      http_status: res?.status,
      response_snippet: snippet,
      attempt_number: attemptNumber,
      next_retry_at: exhausted ? null : new Date(Date.now() + nextDelay * 60_000),
    },
  });
  ```
  On success, `next_retry_at` stays null (the field's default), `status: 'succeeded'`.
- New public method `retryOne(endpoint, eventType, payload, attemptNumber)`
  — thin wrapper the sweep calls, delegating to the same `deliverOne`
  logic (refactor `deliverOne` to accept the attempt number rather than
  duplicating the HTTP-call logic).

**New `backend/src/webhooks/webhook-retry-sweep.service.ts`**
(`WebhookRetrySweepService`), matching `LowStockSweepService`'s
`@Cron` convention:

```ts
@Injectable()
export class WebhookRetrySweepService {
  constructor(private readonly prisma: PrismaService, private readonly dispatch: WebhookDispatchService) {}

  @Cron('*/1 * * * *') // every minute — the shortest backoff step is 1 minute
  async sweepDueRetries() {
    const due = await this.prisma.webhookDeliveryLog.findMany({
      where: { status: 'failed', next_retry_at: { lte: new Date() } },
      include: { endpoint: true },
      take: 100, // safety cap per sweep tick
    });
    for (const row of due) {
      if (!row.endpoint.is_active) continue; // endpoint deactivated since — don't retry into a dead endpoint
      await this.dispatch.retryOne(row.endpoint, row.event_type, row.payload_json as Record<string, unknown>, row.attempt_number + 1);
    }
  }
}
```

Register in `webhooks.module.ts`'s `providers`. No new module needed —
`ScheduleModule` is already global (per `LowStockSweepService`/
`ScheduledReports` already using `@Cron`).

## Frontend

No frontend change required — `settings/index.jsx`'s existing "Delivery
Log" dialog (`REQ060`'s A-8) already renders every `WebhookDeliveryLog`
row for the endpoint via the unchanged `deliveryLog` query; retried rows
simply appear as additional list entries with their own `status`. If the
dialog's status-chip color logic is a flat `succeeded`/`failed` binary
today, it needs one addition: an `'exhausted'` status should render with
the same "failed" red styling (not a new color) — a one-line change to
that chip's color-mapping ternary/switch, not a new UI element.

## Testing

`webhook-dispatch.service.spec.ts` — new cases:
1. A failed delivery (non-2xx) writes `status: 'failed'`, `attempt_number: 1`, `next_retry_at` ≈ now + 1 min.
2. `retryOne` called with `attemptNumber: 6` that still fails writes `status: 'exhausted'`, `next_retry_at: null`.
3. `retryOne` called with `attemptNumber: 2` that succeeds writes `status: 'succeeded'`, `next_retry_at: null`.
4. A decrypt failure (the pre-existing catch path) still returns early without writing a retry-eligible row (matches current behavior — a secret that can't decrypt isn't a transient failure worth retrying).

New `webhook-retry-sweep.service.spec.ts`:
5. Sweep finds only `status: 'failed'` rows with `next_retry_at <= now`, ignores `succeeded`/`exhausted` rows and rows whose `next_retry_at` is still in the future.
6. Sweep skips a row whose endpoint `is_active: false`.
7. Sweep calls `dispatch.retryOne` with `attempt_number + 1`, not a hardcoded value.

Tenant isolation: no new query needs it — the sweep operates across all
orgs by design (a platform-level background job, like `LowStockSweepService`),
and the only org-facing read (`deliveryLog`) already has its
`isSameOrg` check unchanged.

Live verification: temporarily point a real webhook endpoint at an
unreachable URL, trigger a real event, confirm the first log row has
`next_retry_at` ≈1 min out; either wait for the real cron tick or invoke
`sweepDueRetries()` directly in a one-off script to confirm a second log
row appears with `attempt_number: 2`; revert the endpoint URL afterward.

## Verification run

`backend: npx jest src/webhooks --maxWorkers=2`, full suite, `test:int`
(confirms the pre-existing fixture decrypt-error log line is unchanged —
not this slice's concern), `eslint`, `tsc --noEmit`.
