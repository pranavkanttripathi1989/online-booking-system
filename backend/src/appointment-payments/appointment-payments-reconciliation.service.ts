import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const RAZORPAY_ORDERS_URL = 'https://api.razorpay.com/v1/orders';
// A live Razorpay Checkout session is good for far less than this -- 20
// minutes is a safety margin against a slow-but-genuine checkout, not a
// documented Razorpay timeout figure.
const PENDING_STALE_AFTER_MS = 20 * 60 * 1000;

interface RazorpayPaymentEntity {
  id: string;
  status: string; // created | authorized | captured | refunded | failed
}

// REQ040/F-07 -- the webhook (appointment-payments-webhook.controller.ts) is
// the primary reconciliation path; this sweep exists for the rarer case
// where even a webhook delivery is lost (Razorpay retries, but not
// indefinitely). Runs every 15 minutes -- frequent enough that a lost
// webhook doesn't leave a payment silently `pending` for hours, cheap
// enough (a handful of rows at most, one Razorpay API call each) not to
// matter at this scale.
@Injectable()
export class AppointmentPaymentsReconciliationService {
  private readonly logger = new Logger(AppointmentPaymentsReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/15 * * * *')
  async reconcilePendingPayments() {
    const staleBefore = new Date(Date.now() - PENDING_STALE_AFTER_MS);
    const pendingRows = await this.prisma.appointmentPayments.findMany({
      where: { status: 'pending', created_at: { lt: staleBefore }, razorpay_order_id: { not: null } },
    });
    if (pendingRows.length === 0) return;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      this.logger.warn('Razorpay is not configured; skipping pending-payment reconciliation sweep');
      return;
    }
    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;

    for (const payment of pendingRows) {
      await this.reconcileOne(payment, authHeader);
    }
  }

  private async reconcileOne(payment: { id: string; razorpay_order_id: string | null }, authHeader: string) {
    try {
      const res = await fetch(`${RAZORPAY_ORDERS_URL}/${payment.razorpay_order_id}/payments`, {
        headers: { Authorization: authHeader },
      });
      const body = (await res.json()) as { items?: RazorpayPaymentEntity[]; error?: { description?: string } };
      if (!res.ok) {
        await this.logReconciliationAudit(payment.id, 'error', { error: body.error?.description });
        return;
      }

      const captured = body.items?.find((p) => p.status === 'captured');
      if (captured) {
        await this.prisma.appointmentPayments.update({
          where: { id: payment.id },
          data: { status: 'succeeded', razorpay_payment_id: captured.id },
        });
        await this.logReconciliationAudit(payment.id, 'reconciled_succeeded', { razorpay_payment_id: captured.id });
        return;
      }

      // No captured payment exists after the staleness window -- the
      // checkout was abandoned or genuinely failed, not merely slow.
      await this.prisma.appointmentPayments.update({ where: { id: payment.id }, data: { status: 'failed' } });
      await this.logReconciliationAudit(payment.id, 'reconciled_failed', { items: body.items?.length ?? 0 });
    } catch (err) {
      await this.logReconciliationAudit(payment.id, 'error', { error: (err as Error).message });
    }
  }

  private async logReconciliationAudit(resourceId: string, outcome: string, details: Record<string, unknown>) {
    await this.prisma.auditLogs.create({
      data: { user_id: null, action: 'razorpay_reconciliation', resource: 'appointment_payment', resource_id: resourceId, outcome, details: details as Prisma.InputJsonValue },
    });
  }
}
