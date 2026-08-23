import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { VerifyRazorpayPaymentInput } from './dto/appointment-payment.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope } from '../common/scoping/tenant-scope';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';

const RAZORPAY_ORDERS_URL = 'https://api.razorpay.com/v1/orders';

// Indian financial year: April 1 -- March 31. A payment captured in
// Jan-Mar 2027 belongs to FY "2026-27", not "2027-28".
function financialYearFor(date: Date): string {
  const month = date.getMonth() + 1; // 1-12
  const startYear = month >= 4 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

@Injectable()
export class AppointmentPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationTrigger: NotificationTriggerService,
  ) {}

  private razorpayAuthHeader() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new BadRequestException('Razorpay is not configured');
    return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
  }

  // Amount is derived server-side from the appointment's linked product
  // price -- never accepted as a client-supplied argument. A patient-facing
  // mutation that took an amount straight from the request would let anyone
  // pay any price for any appointment (the payment-flow analog of Hard
  // Rule 6's "never trust a client-supplied id/amount").
  async createRazorpayOrder(appointmentId: string) {
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: appointmentId },
      include: { clinic: true, product: true },
    });
    if (!appointment) throw new BadRequestException('Appointment not found');
    const amount = appointment.product?.price;
    if (amount == null) throw new BadRequestException('This appointment has no priced product to pay for');

    const res = await fetch(RAZORPAY_ORDERS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.razorpayAuthHeader(),
      },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: appointment.id,
      }),
    });
    const order = (await res.json()) as { id?: string; error?: { description?: string } };
    if (!res.ok || !order.id) {
      throw new BadRequestException(order.error?.description ?? 'Failed to create Razorpay order');
    }

    await this.prisma.appointmentPayments.create({
      data: {
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        clinic_id: appointment.clinic_id,
        client_org_id: appointment.clinic.client_org_id,
        amount,
        currency: 'INR',
        status: 'pending',
        razorpay_order_id: order.id,
      },
    });

    return {
      razorpay_order_id: order.id,
      amount,
      currency: 'INR',
      razorpay_key_id: process.env.RAZORPAY_KEY_ID,
    };
  }

  // REQ047 (US-BIL-09) -- assigned once, the moment a payment succeeds
  // (called from both verifyRazorpayPayment and the webhook's
  // payment.captured branch, so whichever path lands first is authoritative
  // and the other is a no-op re-write of the same values on retry).
  //
  // gst_rate/cgst/sgst/igst are only ever set to real zeros for a
  // confirmed-exempt product (Products.is_tax_exempt, REQ046) -- a
  // non-exempt item is left with all four null rather than guessing a GST
  // rate this schema has nowhere to source from (no per-product gst_rate,
  // no org-level GSTIN config table; see the schema.prisma comment on
  // PaymentTransactions). Logged as an open gap in REQ047, not silently
  // invented.
  private async nextInvoiceNumber(clinicId: string, series = 'APPT'): Promise<string> {
    const financialYear = financialYearFor(new Date());
    const sequence = await this.prisma.invoiceSequences.upsert({
      where: { clinic_id_series_financial_year: { clinic_id: clinicId, series, financial_year: financialYear } },
      create: { clinic_id: clinicId, series, financial_year: financialYear, last_number: 1 },
      update: { last_number: { increment: 1 } },
    });
    return `INV/${financialYear}/${clinicId.slice(0, 8).toUpperCase()}/${String(sequence.last_number).padStart(5, '0')}`;
  }

  private async invoiceDetailsForSuccess(clinicId: string, appointmentId: string) {
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: appointmentId },
      include: { product: true },
    });
    const product = appointment?.product;
    const invoiceNumber = await this.nextInvoiceNumber(clinicId);

    const gst: Record<string, unknown> = { invoice_number: invoiceNumber };
    if (product?.hsn) gst.hsn_sac_code = product.hsn;
    if (product?.is_tax_exempt) {
      gst.gst_rate = 0;
      gst.cgst_amount = 0;
      gst.sgst_amount = 0;
      gst.igst_amount = 0;
    }
    return gst;
  }

  // Razorpay's documented client-integration verification pattern (distinct
  // from webhooks, which need a publicly reachable URL this local sandbox
  // doesn't have): recompute the HMAC server-side and compare with a
  // constant-time comparison -- never trust a client-reported "succeeded"
  // state (security-requirements.md §5).
  async verifyRazorpayPayment(input: VerifyRazorpayPaymentInput) {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return { success: false, message: 'Razorpay is not configured' };

    const payment = await this.prisma.appointmentPayments.findFirst({
      where: { razorpay_order_id: input.razorpay_order_id, status: 'pending' },
    });
    if (!payment) return { success: false, message: 'Payment order not found' };

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
      .digest('hex');

    const expected = Buffer.from(expectedSignature, 'hex');
    const actual = Buffer.from(input.razorpay_signature, 'hex');
    const matches = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

    if (!matches) {
      await this.prisma.appointmentPayments.update({ where: { id: payment.id }, data: { status: 'failed' } });
      return { success: false, message: 'Payment verification failed' };
    }

    const invoiceDetails = await this.invoiceDetailsForSuccess(payment.clinic_id, payment.appointment_id);
    await this.prisma.appointmentPayments.update({
      where: { id: payment.id },
      data: {
        status: 'succeeded',
        razorpay_payment_id: input.razorpay_payment_id,
        razorpay_signature: input.razorpay_signature,
        ...invoiceDetails,
      },
    });

    // REQ008/PLAN017 — notify the patient's own login account, if linked.
    const patientProfile = await this.prisma.userProfiles.findFirst({
      where: { patient_id: payment.patient_id, is_deleted: false },
    });
    if (patientProfile) {
      await this.notificationTrigger.dispatch(patientProfile.id, 'payment_received', {
        title: 'Payment received',
        message: `Your payment of ₹${(payment.amount / 100).toFixed(2)} was received successfully`,
        type: 'payment',
        action_url: `/finances`,
      });
    }

    return { success: true };
  }

  // REQ040/F-07 — Razorpay calls this server-to-server; there is no JWT to
  // check, so the signature itself is the authentication. `rawBody` must be
  // the exact bytes Razorpay signed (see appointment-payments-webhook.controller.ts),
  // not a re-serialized parse of the body -- key order/whitespace
  // differences would break the HMAC even for a genuine delivery.
  //
  // Throws (→ HTTP 400) rather than returning acknowledged:false for
  // configuration/signature/parse failures -- a webhook that always answers
  // 200 regardless of outcome would hide a misconfigured secret or a broken
  // integration from Razorpay's own delivery-failure monitoring. Every
  // event this codebase *understands and chooses not to act on* still gets
  // a real 200 (see below) -- only genuine failures get a non-2xx.
  async handleRazorpayWebhook(rawBody: Buffer, signatureHeader: string | undefined) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      await this.logWebhookAudit(null, 'razorpay_webhook', 'not_configured', {});
      throw new BadRequestException('Razorpay webhooks are not configured');
    }
    if (!signatureHeader) {
      await this.logWebhookAudit(null, 'razorpay_webhook', 'missing_signature', {});
      throw new BadRequestException('Missing webhook signature');
    }

    const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    const expected = Buffer.from(expectedSignature, 'hex');
    const actual = Buffer.from(signatureHeader, 'hex');
    const matches = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    if (!matches) {
      await this.logWebhookAudit(null, 'razorpay_webhook', 'invalid_signature', {});
      throw new BadRequestException('Invalid webhook signature');
    }

    let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      await this.logWebhookAudit(null, 'razorpay_webhook', 'unparseable_body', {});
      throw new BadRequestException('Unparseable webhook body');
    }

    const eventType = event.event;
    const orderId = event.payload?.payment?.entity?.order_id;
    const paymentId = event.payload?.payment?.entity?.id;

    // Every event type is acknowledged (200 -- Razorpay stops retrying) even
    // when unhandled: refunds/disputes have no schema anywhere in this
    // codebase yet (REQ040), so silently accepting and ignoring them is the
    // honest behavior, not a mishandled event.
    if (eventType !== 'payment.captured' && eventType !== 'payment.failed') {
      await this.logWebhookAudit(null, 'razorpay_webhook', 'ignored', { event: eventType });
      return { acknowledged: true };
    }
    if (!orderId) {
      await this.logWebhookAudit(null, 'razorpay_webhook', 'no_order_id', { event: eventType });
      return { acknowledged: true };
    }

    const payment = await this.prisma.appointmentPayments.findFirst({ where: { razorpay_order_id: orderId } });
    if (!payment) {
      await this.logWebhookAudit(null, 'razorpay_webhook', 'order_not_found', { event: eventType, orderId });
      return { acknowledged: true };
    }

    // Idempotent by construction -- applying the same delivery twice (Razorpay
    // retries at-least-once) lands on the same end state, so no separate
    // event-dedup table is needed. A late `payment.failed` must never regress
    // a row a captured event (or the reconciliation job) already resolved.
    if (eventType === 'payment.captured' && payment.status !== 'succeeded') {
      const invoiceDetails = await this.invoiceDetailsForSuccess(payment.clinic_id, payment.appointment_id);
      await this.prisma.appointmentPayments.update({
        where: { id: payment.id },
        data: { status: 'succeeded', razorpay_payment_id: paymentId ?? payment.razorpay_payment_id, ...invoiceDetails },
      });
    } else if (eventType === 'payment.failed' && payment.status === 'pending') {
      await this.prisma.appointmentPayments.update({ where: { id: payment.id }, data: { status: 'failed' } });
    }

    await this.logWebhookAudit(payment.id, 'razorpay_webhook', 'success', { event: eventType, orderId, paymentId });
    return { acknowledged: true };
  }

  private async logWebhookAudit(resourceId: string | null, action: string, outcome: string, details: Record<string, unknown>) {
    await this.prisma.auditLogs.create({
      data: { user_id: null, action, resource: 'appointment_payment', resource_id: resourceId, outcome, details: details as Prisma.InputJsonValue },
    });
  }

  private toTransaction(row: any) {
    return {
      id: row.id,
      createdAt: row.created_at,
      amount: row.amount / 100,
      status: row.status,
      appointment: {
        id: row.appointment.id,
        clinician: { name: `${row.appointment.clinician.first_name} ${row.appointment.clinician.last_name}` },
        patient: {
          id: row.patient.id,
          firstName: row.patient.first_name,
          lastName: row.patient.last_name,
        },
        product: row.appointment.product ? { name: row.appointment.product.name } : undefined,
      },
    };
  }

  async getTransactionsByDate(startDate: string, endDate: string, limit: number, offset: number, user: JwtPayload) {
    const rows = await this.prisma.appointmentPayments.findMany({
      where: {
        created_at: { gte: new Date(startDate), lte: new Date(endDate) },
        // BUG006 — F-01 ternary; `{}` for an org-less caller returned every
        // tenant's payment records.
        ...orgScope(user),
      },
      include: {
        patient: true,
        appointment: { include: { clinician: true, product: true } },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map((r) => this.toTransaction(r));
  }

  // finances/index.jsx's Payment History tab -- canonical (snake_case)
  // dialect, distinct from getTransactionsByDate's manager/Dashboard.jsx
  // camelCase contract, since this page has no pre-existing gql to match.
  // Income (real captured/attempted payments) only -- expense-row tracking
  // has no schema anywhere in this project (REQ004 open question #3,
  // still unresolved) and is deliberately not guessed at here.
  async myFinanceTransactions(startDate: string, endDate: string, user: JwtPayload) {
    const rows = await this.prisma.appointmentPayments.findMany({
      where: {
        created_at: { gte: new Date(startDate), lte: new Date(endDate) },
        // BUG006 — F-01 ternary; `{}` for an org-less caller returned every
        // tenant's payment records.
        ...orgScope(user),
      },
      include: {
        patient: true,
        appointment: { include: { product: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      amount: r.amount / 100,
      status: r.status,
      patient_name: `${r.patient.first_name} ${r.patient.last_name}`,
      product_name: r.appointment.product?.name,
      // Razorpay's basic checkout handler response doesn't include a
      // card/UPI-level method breakdown without an extra API call this
      // slice doesn't need -- "Razorpay" is the accurate processor name,
      // not a fabricated card-brand-level detail.
      method: 'Razorpay',
      invoice_number: r.invoice_number ?? undefined,
    }));
  }

  // finances/index.jsx's KPI row + Revenue Chart tab. Deliberately its own
  // metric, NOT a reuse of analytics.service.ts's "revenue" -- that's
  // billable value of completed appointments (money that should be owed);
  // this is real captured Razorpay payments (money that was actually
  // collected). Conflating the two would be misleading even though both
  // are called "revenue".
  async myFinanceSummary(startDate: string, endDate: string, user: JwtPayload) {
    const orgFilter = orgScope(user); // BUG006 — was the F-01 ternary
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [thisMonthRows, pending, succeeded, failed, rangeRows] = await Promise.all([
      this.prisma.appointmentPayments.findMany({
        where: { ...orgFilter, status: 'succeeded', created_at: { gte: monthStart } },
        select: { amount: true },
      }),
      this.prisma.appointmentPayments.aggregate({
        where: { ...orgFilter, status: 'pending' },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.appointmentPayments.count({ where: { ...orgFilter, status: 'succeeded' } }),
      this.prisma.appointmentPayments.count({ where: { ...orgFilter, status: 'failed' } }),
      this.prisma.appointmentPayments.findMany({
        where: { ...orgFilter, status: 'succeeded', created_at: { gte: new Date(startDate), lte: new Date(endDate) } },
        select: { amount: true, created_at: true },
      }),
    ]);

    const revenueThisMonth = thisMonthRows.reduce((sum, r) => sum + r.amount, 0) / 100;

    const byMonth = new Map<string, number>();
    for (const row of rangeRows) {
      const key = row.created_at.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      byMonth.set(key, (byMonth.get(key) ?? 0) + row.amount);
    }
    // Map insertion order isn't guaranteed chronological -- sort by parsing
    // the "Mon YYYY" label back into a real date.
    const monthly = [...byMonth.entries()]
      .map(([month, paise]) => ({ month, revenue: paise / 100 }))
      .sort((a, b) => new Date(`1 ${a.month}`).getTime() - new Date(`1 ${b.month}`).getTime());

    return {
      revenue_this_month: revenueThisMonth,
      pending_count: pending._count,
      pending_amount: (pending._sum.amount ?? 0) / 100,
      succeeded_count: succeeded,
      failed_count: failed,
      monthly,
    };
  }
}
