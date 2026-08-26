import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decrypt } from '../common/crypto/secrets';

// REQ030 (US-INT-02, scoped down) + REQ112 (retry). The original delivery
// is always synchronous (attempt 1); a failure schedules a retry via
// WebhookDeliveryLog.next_retry_at, picked up by WebhookRetrySweepService's
// own @Cron sweep — a fixed backoff schedule (1m/5m/30m/2h/6h across 5
// retries), matching this codebase's existing sweep-service convention
// (LowStockSweepService/RetentionPurgeService) rather than introducing a
// new queue library (no BullMQ/@nestjs/bull dependency exists in this
// codebase despite CLAUDE.md's Architecture section mentioning it in
// passing — Redis here is a plain ioredis client for rate-limiting/pub-sub
// only). No new HTTP-client convention introduced — same global fetch()
// already used by createRazorpayOrder.
const BACKOFF_MINUTES = [1, 5, 30, 120, 360]; // delay before attempt 2..6
const MAX_ATTEMPTS = 6;

@Injectable()
export class WebhookDispatchService {
  private readonly logger = new Logger(WebhookDispatchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async fireEvent(clientOrgId: string, eventType: string, payload: Record<string, unknown>) {
    const endpoints = await this.prisma.webhookEndpoints.findMany({
      where: { client_org_id: clientOrgId, is_active: true },
    });
    const subscribed = endpoints.filter((e) => {
      const types = Array.isArray(e.event_types_json) ? (e.event_types_json as string[]) : [];
      return types.includes(eventType);
    });
    if (subscribed.length === 0) return;

    await Promise.all(subscribed.map((endpoint) => this.deliverOne(endpoint, eventType, payload, 1)));
  }

  // Called by WebhookRetrySweepService with attemptNumber = the retry
  // number about to be made (2..6).
  async retryOne(endpoint: { id: string; url: string; secret: string }, eventType: string, payload: Record<string, unknown>, attemptNumber: number) {
    return this.deliverOne(endpoint, eventType, payload, attemptNumber);
  }

  private async deliverOne(endpoint: { id: string; url: string; secret: string }, eventType: string, payload: Record<string, unknown>, attemptNumber: number) {
    const body = JSON.stringify({ event: eventType, data: payload });
    let secret: string;
    try {
      secret = decrypt(endpoint.secret);
    } catch (err) {
      this.logger.error(`Failed to decrypt secret for webhook endpoint ${endpoint.id}`, err as Error);
      return;
    }
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

    try {
      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-MediBook-Signature': signature },
        body,
      });
      const snippet = await res.text().then((t) => t.slice(0, 500)).catch(() => undefined);
      if (res.ok) {
        await this.prisma.webhookDeliveryLog.create({
          data: {
            endpoint_id: endpoint.id,
            event_type: eventType,
            payload_json: payload as Prisma.InputJsonValue,
            status: 'succeeded',
            http_status: res.status,
            response_snippet: snippet,
            attempt_number: attemptNumber,
          },
        });
      } else {
        await this.logFailureAndScheduleRetry(endpoint.id, eventType, payload, attemptNumber, res.status, snippet);
      }
    } catch (err) {
      await this.logFailureAndScheduleRetry(endpoint.id, eventType, payload, attemptNumber, undefined, (err as Error).message?.slice(0, 500));
    }
  }

  private async logFailureAndScheduleRetry(
    endpointId: string,
    eventType: string,
    payload: Record<string, unknown>,
    attemptNumber: number,
    httpStatus: number | undefined,
    snippet: string | undefined,
  ) {
    const exhausted = attemptNumber >= MAX_ATTEMPTS;
    const nextDelay = BACKOFF_MINUTES[attemptNumber - 1];
    await this.prisma.webhookDeliveryLog.create({
      data: {
        endpoint_id: endpointId,
        event_type: eventType,
        payload_json: payload as Prisma.InputJsonValue,
        status: exhausted ? 'exhausted' : 'failed',
        http_status: httpStatus,
        response_snippet: snippet,
        attempt_number: attemptNumber,
        next_retry_at: exhausted ? null : new Date(Date.now() + nextDelay * 60_000),
      },
    });
  }
}
