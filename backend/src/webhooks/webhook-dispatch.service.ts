import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decrypt } from '../common/crypto/secrets';

// REQ030 (US-INT-02, scoped down). Best-effort/synchronous delivery, no
// retry queue — the requirement doc's own P1 acceptance criterion
// (exponential-backoff retry) is deliberately deferred, not silently
// dropped: WebhookDeliveryLog records every attempt's outcome so a failed
// delivery is visible and re-triggerable by hand, just not auto-retried.
// No new HTTP-client convention introduced — same global fetch() already
// used by createRazorpayOrder.
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

    await Promise.all(subscribed.map((endpoint) => this.deliverOne(endpoint, eventType, payload)));
  }

  private async deliverOne(endpoint: { id: string; url: string; secret: string }, eventType: string, payload: Record<string, unknown>) {
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
      await this.prisma.webhookDeliveryLog.create({
        data: {
          endpoint_id: endpoint.id,
          event_type: eventType,
          payload_json: payload as Prisma.InputJsonValue,
          status: res.ok ? 'succeeded' : 'failed',
          http_status: res.status,
          response_snippet: snippet,
        },
      });
    } catch (err) {
      await this.prisma.webhookDeliveryLog.create({
        data: {
          endpoint_id: endpoint.id,
          event_type: eventType,
          payload_json: payload as Prisma.InputJsonValue,
          status: 'failed',
          response_snippet: (err as Error).message?.slice(0, 500),
        },
      });
    }
  }
}
