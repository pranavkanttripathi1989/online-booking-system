import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookDispatchService } from './webhook-dispatch.service';

// REQ112 — runs every minute since the shortest backoff step is 1 minute.
// Operates across all orgs by design, matching LowStockSweepService's own
// platform-level pattern; the only org-facing read (deliveryLog) is
// already org-scoped and unchanged by this slice.
@Injectable()
export class WebhookRetrySweepService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatch: WebhookDispatchService,
  ) {}

  @Cron('*/1 * * * *')
  async sweepDueRetries() {
    const due = await this.prisma.webhookDeliveryLog.findMany({
      where: { status: 'failed', next_retry_at: { lte: new Date() } },
      include: { endpoint: true },
      take: 100, // safety cap per sweep tick
    });
    for (const row of due) {
      if (!row.endpoint.is_active) continue; // deactivated since the failure — don't retry into a dead endpoint
      await this.dispatch.retryOne(
        row.endpoint,
        row.event_type,
        row.payload_json as Record<string, unknown>,
        row.attempt_number + 1,
      );
    }
  }
}
