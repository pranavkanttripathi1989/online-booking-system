import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  VerifyRazorpayPaymentInput,
  RecordCounterPaymentInput,
  RedeemPackageSittingInput,
  DecideDiscountApprovalInput,
  CloseCashDrawerInput,
  RequestRefundInput,
  DecideRefundRequestInput,
} from './dto/appointment-payment.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, isSameOrg } from '../common/scoping/tenant-scope';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { resolveServicePrice } from '../common/pricing/resolve-price';
import { WebhookDispatchService } from '../webhooks/webhook-dispatch.service';
import { BranchOverridesService } from '../branch-overrides/branch-overrides.service';
import { PaymentGatewayConfigService } from '../payment-gateways/payment-gateway-config.service';
import { CancellationRulesService } from '../cancellation-rules/cancellation-rules.service';
import { selectApplicableRule, computeCancellationFee, hoursBetween } from '../common/scheduling/cancellation-fee';
import { NormalizedWebhookEvent } from '../payment-gateways/providers/provider.interface';
import { getProvider } from '../payment-gateways/providers/registry';

const RUPEES_TO_PAISE = (rupees: number) => Math.round(rupees * 100);
const PAISE_TO_RUPEES = (paise: number) => paise / 100;

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
    private readonly webhookDispatch: WebhookDispatchService,
    private readonly branchOverrides: BranchOverridesService,
    private readonly paymentGatewayConfig: PaymentGatewayConfigService,
    private readonly cancellationRules: CancellationRulesService,
  ) {}

  // Amount is derived server-side from the appointment's linked product
  // price -- never accepted as a client-supplied argument. A patient-facing
  // mutation that took an amount straight from the request would let anyone
  // pay any price for any appointment (the payment-flow analog of Hard
  // Rule 6's "never trust a client-supplied id/amount").
  //
  // REQ175 -- resolves the clinic's own configured gateway via the
  // registry (falling back to the platform's env-var Razorpay when
  // unconfigured, PaymentGatewayConfigService's own zero-regression path).
  // This is a behaviour-preserving refactor for the overwhelming default
  // case: razorpayProvider.createOrder() is the exact extracted logic this
  // method used to run inline, so an org that never touches the new
  // per-clinic gateway settings sees no difference at all.
  async createRazorpayOrder(appointmentId: string) {
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: appointmentId },
      include: { clinic: true, product: true, patient: true },
    });
    if (!appointment) throw new BadRequestException('Appointment not found');
    // REQ016 (US-CAT-04) — the actual charge-determining call site. Channel
    // 'online' because a Razorpay checkout IS the online payment channel by
    // definition (see resolveServicePrice()'s own comment); reads through
    // the same shared helper appointments.service.ts's display mapping
    // uses, never appointment.product.price directly.
    // REQ055 (US-ORG-05) — a branch may have overridden or skipped the
    // org-level master this appointment's product actually is.
    const branchOverride = await this.branchOverrides.getForPricing(appointment.product_id, appointment.clinic_id);
    const amount = resolveServicePrice(appointment.product, appointment.patient, 'online', branchOverride);
    if (amount == null) throw new BadRequestException('This appointment has no priced product to pay for');

    const { provider, credentials } = await this.paymentGatewayConfig.getActiveConfigForClinic(appointment.clinic_id);
    let order;
    try {
      order = await provider.createOrder(credentials, { amountPaise: amount, receipt: appointment.id });
    } catch (e: any) {
      throw new BadRequestException(e.message ?? 'Failed to create payment order');
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
        gateway: provider.id,
        gateway_order_id: order.gatewayOrderId,
        // Dual-write the legacy column only for the razorpay path -- zero
        // regression for any existing code/report reading it directly.
        razorpay_order_id: provider.id === 'razorpay' ? order.gatewayOrderId : undefined,
      },
    });

    return {
      // razorpay_order_id kept populated for the razorpay path so the
      // existing booking/index.jsx contract (pre-dating this registry)
      // keeps working with zero frontend change.
      razorpay_order_id: order.gatewayOrderId,
      amount,
      currency: 'INR',
      razorpay_key_id: order.razorpayKeyId,
      gateway: provider.id,
      checkout_type: order.checkoutType,
      redirect_url: order.redirectUrl,
      form_post_url: order.formPostUrl,
      form_fields: order.formFields ? Object.entries(order.formFields).map(([key, value]) => ({ key, value })) : undefined,
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

  // REQ101 — closes the gap this method's own comment above previously
  // logged: gst_rate/cgst/sgst/igst are populated for a real non-exempt
  // item once BOTH the product's gst_rate AND the clinic's gstin are
  // configured; either missing leaves all four null (never guessed).
  // Intrastate-only (always CGST+SGST, never IGST) — Patients has no
  // structured state field to compare against the clinic's, so a true
  // interstate determination is out of scope here (see REQ101's own doc).
  private async invoiceDetailsForSuccess(clinicId: string, appointmentId: string, amountPaise: number) {
    const [appointment, clinic] = await Promise.all([
      this.prisma.appointments.findUnique({ where: { id: appointmentId }, include: { product: true } }),
      this.prisma.clinics.findUnique({ where: { id: clinicId } }),
    ]);
    const product = appointment?.product;
    const invoiceNumber = await this.nextInvoiceNumber(clinicId);

    const gst: Record<string, unknown> = { invoice_number: invoiceNumber };
    if (product?.hsn) gst.hsn_sac_code = product.hsn;
    if (product?.is_tax_exempt) {
      gst.gst_rate = 0;
      gst.cgst_amount = 0;
      gst.sgst_amount = 0;
      gst.igst_amount = 0;
    } else if (product?.gst_rate != null && clinic?.gstin) {
      gst.gst_rate = product.gst_rate;
      gst.gstin = clinic.gstin;
      gst.place_of_supply = clinic.state ?? undefined;
      const half = Math.round((amountPaise * product.gst_rate) / 2 / 100);
      gst.cgst_amount = half;
      gst.sgst_amount = half;
      gst.igst_amount = 0;
    }
    return gst;
  }

  // REQ018 (US-BOOK-03) — mirrors invoiceDetailsForSuccess's own "called
  // from both verifyRazorpayPayment and the webhook" shape. An appointment
  // left in 'awaiting_payment' by createAppointment (Products.prepayment_policy
  // === 'required') only ever confirms here, on a real payment success —
  // never on booking itself. A no-op for the ordinary case (most
  // appointments are never 'awaiting_payment' to begin with).
  private async confirmAppointmentIfAwaitingPayment(appointmentId: string) {
    const appointment = await this.prisma.appointments.findUnique({ where: { id: appointmentId }, include: { clinic: true } });
    if (!appointment || appointment.status !== 'awaiting_payment') return;
    await this.prisma.appointments.update({ where: { id: appointmentId }, data: { status: 'confirmed' } });
    await this.prisma.appointmentStatusLogs.create({
      data: { appointment_id: appointmentId, status: 'confirmed', reason: 'Prepayment received' },
    });
    if (appointment.clinic.client_org_id) {
      await this.webhookDispatch.fireEvent(appointment.clinic.client_org_id, 'appointment.confirmed', {
        appointment_id: appointmentId,
      });
    }
  }

  // Shared by recordCounterPayment's own inline (below-threshold) path and
  // decideDiscountApproval's approve path — the actual payment-creation
  // transaction, confirm-if-awaiting-payment, and webhook dispatch, so
  // there is exactly one place that ever creates a real AppointmentPayments
  // row for a counter payment, whether or not a discount needed approval.
  private async finalizeCounterPayment(
    appointment: { id: string; clinic_id: string; patient_id: string; clinic: { client_org_id: string | null } },
    tendersPaise: { tender_type: string; reference?: string; amountPaise: number }[],
    netAmountPaise: number,
    discountAmountPaise: number,
    discountReason: string | undefined,
    approvedByUserId: string | null,
    recordedByUserId: string,
  ) {
    const invoiceDetails = await this.invoiceDetailsForSuccess(appointment.clinic_id, appointment.id, netAmountPaise);
    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.appointmentPayments.create({
        data: {
          appointment_id: appointment.id,
          patient_id: appointment.patient_id,
          clinic_id: appointment.clinic_id,
          client_org_id: appointment.clinic.client_org_id,
          amount: netAmountPaise,
          currency: 'INR',
          status: 'succeeded',
          discount_amount: discountAmountPaise,
          discount_reason: discountReason,
          approved_by_user_id: approvedByUserId ?? undefined,
          ...invoiceDetails,
        },
      });
      await tx.paymentTenders.createMany({
        data: tendersPaise.map((t) => ({
          appointment_payment_id: created.id,
          tender_type: t.tender_type,
          amount: t.amountPaise,
          reference: t.reference,
          recorded_by_user_id: recordedByUserId,
        })),
      });
      return created;
    });
    await this.confirmAppointmentIfAwaitingPayment(appointment.id);
    if (appointment.clinic.client_org_id) {
      await this.webhookDispatch.fireEvent(appointment.clinic.client_org_id, 'payment.succeeded', {
        appointment_id: appointment.id,
        amount: netAmountPaise,
      });
    }
    return payment;
  }

  // Same "return the clinic row itself, or null" shape as
  // branch-overrides.service.ts's own findScopedClinic.
  private async findScopedClinic(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) return null;
    if (user.client_org_id && clinic.client_org_id !== user.client_org_id) return null;
    return clinic;
  }

  // REQ023 (US-BIL-01, scoped subset) — front-desk mixed-tender counter
  // billing: cash/UPI/card/cheque, manually recorded, closing an
  // appointment's bill without going through Razorpay at all. Unlike
  // createRazorpayOrder/verifyRazorpayPayment (deliberately @Public() —
  // see those methods' own comments on why), this is a genuine staff-auth
  // operation with no anonymous-caller precedent to preserve, so it's
  // gated by @Auth() at the resolver, not throttled-and-public.
  //
  // No partial/underpaid close in this first slice — tenders must sum to
  // exactly the resolved amount due, or the whole call is rejected before
  // any write. Partial-payment tracking is a separate, deferred US-BIL-*
  // concern (PLAN064).
  //
  // REQ056 (US-BIL-03) — a discount at or below the org's configured
  // threshold is applied inline, right here, with no approval step at all
  // (approved_by_user_id stays null — there's nothing to approve). A
  // discount ABOVE the threshold is never applied inline: this method
  // queues a DiscountApprovalRequests row instead and returns without
  // creating any payment — decideDiscountApproval is the only path that
  // can ever finalize it.
  async recordCounterPayment(input: RecordCounterPaymentInput, user: JwtPayload) {
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: input.appointment_id },
      include: { clinic: { include: { client_organization: true } }, product: true, patient: true },
    });
    if (!appointment) throw new BadRequestException('Appointment not found');
    if (!isSameOrg(user, appointment.clinic.client_org_id)) {
      throw new BadRequestException('Appointment not found');
    }

    // REQ016 (US-CAT-04) — 'walkin' channel: a counter payment IS the
    // walk-in channel by definition, matching createRazorpayOrder's own
    // 'online' tagging for the Razorpay path.
    const branchOverride = await this.branchOverrides.getForPricing(appointment.product_id, appointment.clinic_id);
    const expectedAmount = resolveServicePrice(appointment.product, appointment.patient, 'walkin', branchOverride);
    if (expectedAmount == null) {
      throw new BadRequestException('This appointment has no priced product to bill');
    }

    const discountAmountPaise = input.discount_amount ? RUPEES_TO_PAISE(input.discount_amount) : 0;
    if (discountAmountPaise > 0 && !input.discount_reason?.trim()) {
      throw new BadRequestException('A discount requires a reason');
    }
    if (discountAmountPaise > expectedAmount) {
      throw new BadRequestException('Discount cannot exceed the amount due');
    }
    const netAmount = expectedAmount - discountAmountPaise;

    const tendersPaise = input.tenders.map((t) => ({ ...t, amountPaise: RUPEES_TO_PAISE(t.amount) }));
    const totalPaise = tendersPaise.reduce((sum, t) => sum + t.amountPaise, 0);
    if (totalPaise !== netAmount) {
      throw new BadRequestException(
        `Tenders total ₹${(totalPaise / 100).toFixed(2)} does not match the amount due ₹${(netAmount / 100).toFixed(2)}`,
      );
    }

    const threshold = appointment.clinic.client_organization?.discount_approval_threshold_paise ?? 100000;
    if (discountAmountPaise > threshold) {
      const request = await this.prisma.discountApprovalRequests.create({
        data: {
          appointment_id: appointment.id,
          clinic_id: appointment.clinic_id,
          client_org_id: appointment.clinic.client_org_id,
          requested_by_user_id: user.sub,
          discount_amount: discountAmountPaise,
          discount_reason: input.discount_reason as string,
          expected_amount_paise: expectedAmount,
          tenders_json: tendersPaise.map((t) => ({ tender_type: t.tender_type, amountPaise: t.amountPaise, reference: t.reference ?? null })),
        },
      });
      return { success: true, pending_approval_id: request.id };
    }

    const payment = await this.finalizeCounterPayment(appointment, tendersPaise, netAmount, discountAmountPaise, input.discount_reason, null, user.sub);
    return { success: true, payment_id: payment.id, invoice_number: payment.invoice_number ?? undefined };
  }

  private discountRequestToGraphQL(row: any) {
    return {
      id: row.id,
      appointment_id: row.appointment_id,
      clinic_id: row.clinic_id,
      requested_by_user_id: row.requested_by_user_id,
      discount_amount: PAISE_TO_RUPEES(row.discount_amount),
      discount_reason: row.discount_reason,
      expected_amount: PAISE_TO_RUPEES(row.expected_amount_paise),
      status: row.status,
      approved_by_user_id: row.approved_by_user_id ?? undefined,
      decided_at: row.decided_at ?? undefined,
      created_at: row.created_at,
    };
  }

  // clinic_id optional, matching this batch's own tenancy-matrix-
  // compatibility precedent (packages/checklist/branch-overrides).
  async discountApprovalRequests(clinicId: string | undefined, user: JwtPayload) {
    const rows = await this.prisma.discountApprovalRequests.findMany({
      where: { ...(clinicId ? { clinic_id: clinicId } : {}), ...orgScope(user) },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => this.discountRequestToGraphQL(r));
  }

  // REQ056 (US-BIL-03) — a distinct, higher-role-gated mutation (see the
  // resolver's own @Auth). The requester can never approve their own
  // request, even if they also happen to hold a manager+ role — the whole
  // point of the control is a genuinely second party reviewing it.
  async decideDiscountApproval(input: DecideDiscountApprovalInput, user: JwtPayload) {
    const request = await this.prisma.discountApprovalRequests.findUnique({
      where: { id: input.request_id },
      include: { appointment: { include: { clinic: true } } },
    });
    if (!request) throw new BadRequestException('Discount request not found');
    if (!isSameOrg(user, request.client_org_id)) {
      throw new BadRequestException('Discount request not found');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('This discount request has already been decided');
    }
    if (request.requested_by_user_id === user.sub) {
      throw new BadRequestException('Cannot approve your own discount request');
    }

    if (input.decision === 'reject') {
      await this.prisma.discountApprovalRequests.update({
        where: { id: request.id },
        data: { status: 'rejected', approved_by_user_id: user.sub, decided_at: new Date() },
      });
      return { success: true };
    }

    const tendersPaise = (request.tenders_json as any[]).map((t) => ({
      tender_type: t.tender_type,
      amountPaise: t.amountPaise,
      reference: t.reference ?? undefined,
    }));
    const netAmount = request.expected_amount_paise - request.discount_amount;
    const payment = await this.finalizeCounterPayment(
      request.appointment,
      tendersPaise,
      netAmount,
      request.discount_amount,
      request.discount_reason,
      user.sub,
      request.requested_by_user_id,
    );
    await this.prisma.discountApprovalRequests.update({
      where: { id: request.id },
      data: { status: 'approved', approved_by_user_id: user.sub, decided_at: new Date(), resulting_payment_id: payment.id },
    });
    return { success: true, payment_id: payment.id };
  }

  private closeoutToGraphQL(row: any, breakdown: { tender_type: string; expected_paise: number; counted_paise: number }[]) {
    return {
      id: row.id,
      clinic_id: row.clinic_id,
      closed_by_user_id: row.closed_by_user_id,
      business_date: row.business_date,
      breakdown: breakdown.map((b) => ({
        tender_type: b.tender_type,
        expected: PAISE_TO_RUPEES(b.expected_paise),
        counted: PAISE_TO_RUPEES(b.counted_paise),
        variance: PAISE_TO_RUPEES(b.counted_paise - b.expected_paise),
      })),
      total_expected: PAISE_TO_RUPEES(row.total_expected_paise),
      total_counted: PAISE_TO_RUPEES(row.total_counted_paise),
      variance: PAISE_TO_RUPEES(row.variance_paise),
      notes: row.notes ?? undefined,
      created_at: row.created_at,
    };
  }

  // REQ056 (US-BIL-04, scoped subset) — expected totals are computed
  // server-side from real succeeded AppointmentPayments/PaymentTenders
  // rows for the given clinic/date, never trusted from the caller; only
  // the counted (physical) totals come from the input. One closeout per
  // (clinic, business_date) — the unique constraint rejects a second
  // attempt to close an already-closed date outright, rather than silently
  // overwriting an earlier count. Denomination-level breakdown and formal
  // shift handover are explicitly deferred — see REQ056's own doc.
  async closeCashDrawer(input: CloseCashDrawerInput, user: JwtPayload) {
    const clinic = await this.findScopedClinic(input.clinic_id, user);
    if (!clinic) return { success: false, message: 'Clinic not found' };

    const businessDate = new Date(`${input.business_date}T00:00:00.000Z`);
    if (Number.isNaN(businessDate.getTime())) {
      return { success: false, message: 'business_date must be a valid YYYY-MM-DD date' };
    }
    const nextDate = new Date(businessDate.getTime() + 24 * 60 * 60 * 1000);

    const tenders = await this.prisma.paymentTenders.findMany({
      where: {
        appointment_payment: {
          clinic_id: clinic.id,
          status: 'succeeded',
          created_at: { gte: businessDate, lt: nextDate },
        },
      },
    });
    const expectedByType = new Map<string, number>();
    for (const t of tenders) {
      expectedByType.set(t.tender_type, (expectedByType.get(t.tender_type) ?? 0) + t.amount);
    }
    const countedByType = new Map<string, number>();
    for (const c of input.counted) {
      countedByType.set(c.tender_type, (countedByType.get(c.tender_type) ?? 0) + RUPEES_TO_PAISE(c.amount));
    }
    const allTypes = new Set([...expectedByType.keys(), ...countedByType.keys()]);
    const breakdown = Array.from(allTypes).map((tender_type) => ({
      tender_type,
      expected_paise: expectedByType.get(tender_type) ?? 0,
      counted_paise: countedByType.get(tender_type) ?? 0,
    }));
    const totalExpected = breakdown.reduce((sum, b) => sum + b.expected_paise, 0);
    const totalCounted = breakdown.reduce((sum, b) => sum + b.counted_paise, 0);

    try {
      const closeout = await this.prisma.cashDrawerCloseouts.create({
        data: {
          clinic_id: clinic.id,
          client_org_id: clinic.client_org_id,
          closed_by_user_id: user.sub,
          business_date: businessDate,
          breakdown_json: Object.fromEntries(
            breakdown.map((b) => [b.tender_type, { expected_paise: b.expected_paise, counted_paise: b.counted_paise }]),
          ),
          total_expected_paise: totalExpected,
          total_counted_paise: totalCounted,
          variance_paise: totalCounted - totalExpected,
          notes: input.notes,
        },
      });
      return { success: true, closeout: this.closeoutToGraphQL(closeout, breakdown) };
    } catch (e: any) {
      if (e.code === 'P2002') {
        return { success: false, message: "This clinic's drawer has already been closed for this date" };
      }
      return { success: false, message: e.message ?? 'Failed to close cash drawer' };
    }
  }

  // clinic_id optional, matching this batch's own tenancy-matrix-
  // compatibility precedent.
  async cashDrawerCloseouts(clinicId: string | undefined, user: JwtPayload) {
    const rows = await this.prisma.cashDrawerCloseouts.findMany({
      where: { ...(clinicId ? { clinic_id: clinicId } : {}), ...orgScope(user) },
      orderBy: { business_date: 'desc' },
    });
    return rows.map((row) => {
      const json = (row.breakdown_json ?? {}) as Record<string, { expected_paise: number; counted_paise: number }>;
      const breakdown = Object.entries(json).map(([tender_type, v]) => ({
        tender_type,
        expected_paise: v.expected_paise,
        counted_paise: v.counted_paise,
      }));
      return this.closeoutToGraphQL(row, breakdown);
    });
  }

  // REQ054 (US-CAT-01) — a sibling mutation to recordCounterPayment, not a
  // shoehorned zero-amount case through it: that method's own tenders-must-
  // sum-to-exactly-the-amount-due validation has no meaning for a
  // redemption (there is no amount due). Records a zero-amount
  // AppointmentPayments row so existing payment-status reporting keeps
  // working for a package-redeemed visit without a parallel "paid" concept
  // — metadata carries the redemption's own provenance. resolveServicePrice()
  // is deliberately never called here: a redemption has no price to resolve.
  async redeemPackageSitting(input: RedeemPackageSittingInput, user: JwtPayload) {
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: input.appointment_id },
      include: { clinic: true },
    });
    if (!appointment) throw new BadRequestException('Appointment not found');
    if (!isSameOrg(user, appointment.clinic.client_org_id)) {
      throw new BadRequestException('Appointment not found');
    }

    const patientPackage = await this.prisma.patientPackages.findUnique({ where: { id: input.patient_package_id } });
    if (!patientPackage || patientPackage.is_deleted) {
      throw new BadRequestException('Package not found');
    }
    if (!isSameOrg(user, patientPackage.client_org_id)) {
      throw new BadRequestException('Package not found');
    }
    if (patientPackage.patient_id !== appointment.patient_id) {
      throw new BadRequestException('This package does not belong to this appointment\'s patient');
    }
    if (patientPackage.expires_at < new Date()) {
      throw new BadRequestException('This package has expired');
    }
    // Read-then-guard-then-decrement inside the same transaction, the same
    // shape DrugBatches.quantity_remaining's consumption path uses (REQ022).
    if (patientPackage.sittings_remaining < 1) {
      throw new BadRequestException('No sittings remaining on this package');
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.patientPackages.findUnique({ where: { id: input.patient_package_id } });
      if (!fresh || fresh.sittings_remaining < 1) {
        throw new BadRequestException('No sittings remaining on this package');
      }
      await tx.patientPackages.update({
        where: { id: input.patient_package_id },
        data: { sittings_remaining: { decrement: 1 } },
      });
      return tx.appointmentPayments.create({
        data: {
          appointment_id: appointment.id,
          patient_id: appointment.patient_id,
          clinic_id: appointment.clinic_id,
          client_org_id: appointment.clinic.client_org_id,
          amount: 0,
          currency: 'INR',
          status: 'succeeded',
          metadata: { package_redemption: true, patient_package_id: input.patient_package_id },
        },
      });
    });
    await this.confirmAppointmentIfAwaitingPayment(appointment.id);
    if (appointment.clinic.client_org_id) {
      await this.webhookDispatch.fireEvent(appointment.clinic.client_org_id, 'payment.succeeded', {
        appointment_id: appointment.id,
        amount: 0,
      });
    }

    const updated = await this.prisma.patientPackages.findUnique({ where: { id: input.patient_package_id } });
    return { success: true, payment_id: payment.id, sittings_remaining: updated?.sittings_remaining };
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

    const invoiceDetails = await this.invoiceDetailsForSuccess(payment.clinic_id, payment.appointment_id, payment.amount);
    await this.prisma.appointmentPayments.update({
      where: { id: payment.id },
      data: {
        status: 'succeeded',
        razorpay_payment_id: input.razorpay_payment_id,
        razorpay_signature: input.razorpay_signature,
        gateway_payment_id: input.razorpay_payment_id,
        ...invoiceDetails,
      },
    });
    await this.confirmAppointmentIfAwaitingPayment(payment.appointment_id);
    if (payment.client_org_id) {
      await this.webhookDispatch.fireEvent(payment.client_org_id, 'payment.succeeded', {
        appointment_id: payment.appointment_id,
        amount: payment.amount,
      });
    }

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
    if (!signatureHeader) {
      await this.logWebhookAudit(null, 'razorpay_webhook', 'missing_signature', {});
      throw new BadRequestException('Missing webhook signature');
    }

    let event: {
      event?: string;
      payload?: {
        payment?: { entity?: { id?: string; order_id?: string } };
        refund?: { entity?: { id?: string; payment_id?: string } };
      };
    };
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      await this.logWebhookAudit(null, 'razorpay_webhook', 'unparseable_body', {});
      throw new BadRequestException('Unparseable webhook body');
    }

    const eventType = event.event;
    const orderId = event.payload?.payment?.entity?.order_id;
    const paymentId = event.payload?.payment?.entity?.id;
    const refundPaymentId = event.payload?.refund?.entity?.payment_id;
    const refundId = event.payload?.refund?.entity?.id;
    const isRefundEvent = eventType === 'refund.processed' || eventType === 'refund.failed';

    // REQ176 -- refund.processed/refund.failed closes the gap this webhook
    // used to acknowledge-and-drop entirely (see this method's own prior
    // comment history): a refund's own gateway_payment_id, not order_id,
    // is what identifies the row, since a refund event carries no order_id
    // of its own.
    if (isRefundEvent && !refundPaymentId) {
      await this.logWebhookAudit(null, 'razorpay_webhook', 'no_payment_id', { event: eventType });
      return { acknowledged: true };
    }
    // Every other unrecognised event type is still acknowledged (200 --
    // Razorpay stops retrying) rather than mishandled.
    if (!isRefundEvent && eventType !== 'payment.captured' && eventType !== 'payment.failed') {
      await this.logWebhookAudit(null, 'razorpay_webhook', 'ignored', { event: eventType });
      return { acknowledged: true };
    }
    if (!isRefundEvent && !orderId) {
      await this.logWebhookAudit(null, 'razorpay_webhook', 'no_order_id', { event: eventType });
      return { acknowledged: true };
    }

    // Real bug found on re-review: this used to verify against the
    // platform's own env-var RAZORPAY_WEBHOOK_SECRET unconditionally,
    // before REQ175 gave clinics the ability to configure their own
    // distinct Razorpay account (its own webhook_secret). Any clinic that
    // actually did this would have every one of their real webhooks
    // rejected outright (wrong secret), leaving payments stuck 'pending'
    // forever -- the reconciliation sweep
    // (appointment-payments-reconciliation.service.ts) has the identical
    // platform-only-credentials gap, tracked separately. Fixed the same
    // way verifyAndApplyGatewayEvent() below already handles the other
    // three gateways: parse first (safe -- it grants no capability by
    // itself), resolve the specific payment's own clinic, THEN verify
    // against that clinic's own credentials, falling back to the
    // platform's env-var Razorpay config when the clinic has none
    // configured (getActiveConfigForClinic's own established default).
    const payment = isRefundEvent
      ? await this.prisma.appointmentPayments.findFirst({ where: { razorpay_payment_id: refundPaymentId } })
      : await this.prisma.appointmentPayments.findFirst({ where: { razorpay_order_id: orderId } });
    if (!payment) {
      await this.logWebhookAudit(null, 'razorpay_webhook', isRefundEvent ? 'payment_not_found' : 'order_not_found', {
        event: eventType,
        orderId,
        refundPaymentId,
      });
      return { acknowledged: true };
    }

    const { credentials } = await this.paymentGatewayConfig.getActiveConfigForClinic(payment.clinic_id);
    if (!credentials.webhook_secret) {
      await this.logWebhookAudit(payment.id, 'razorpay_webhook', 'not_configured', {});
      throw new BadRequestException('Razorpay webhooks are not configured');
    }
    const expectedSignature = crypto.createHmac('sha256', credentials.webhook_secret).update(rawBody).digest('hex');
    const expected = Buffer.from(expectedSignature, 'hex');
    const actual = Buffer.from(signatureHeader, 'hex');
    const matches = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    if (!matches) {
      await this.logWebhookAudit(payment.id, 'razorpay_webhook', 'invalid_signature', {});
      throw new BadRequestException('Invalid webhook signature');
    }

    if (isRefundEvent) {
      await this.prisma.appointmentPayments.update({
        where: { id: payment.id },
        data: {
          refund_status: eventType === 'refund.processed' ? 'refunded' : 'failed',
          refunded_at: eventType === 'refund.processed' ? new Date() : payment.refunded_at,
          gateway_refund_id: refundId ?? payment.gateway_refund_id,
        },
      });
      await this.logWebhookAudit(payment.id, 'razorpay_webhook', 'success', { event: eventType, refundPaymentId, refundId });
      return { acknowledged: true };
    }

    // Idempotent by construction -- applying the same delivery twice (Razorpay
    // retries at-least-once) lands on the same end state, so no separate
    // event-dedup table is needed. A late `payment.failed` must never regress
    // a row a captured event (or the reconciliation job) already resolved.
    if (eventType === 'payment.captured' && payment.status !== 'succeeded') {
      const invoiceDetails = await this.invoiceDetailsForSuccess(payment.clinic_id, payment.appointment_id, payment.amount);
      await this.prisma.appointmentPayments.update({
        where: { id: payment.id },
        data: { status: 'succeeded', razorpay_payment_id: paymentId ?? payment.razorpay_payment_id, gateway_payment_id: paymentId ?? payment.gateway_payment_id, ...invoiceDetails },
      });
      await this.confirmAppointmentIfAwaitingPayment(payment.appointment_id);
      if (payment.client_org_id) {
        await this.webhookDispatch.fireEvent(payment.client_org_id, 'payment.succeeded', {
          appointment_id: payment.appointment_id,
          amount: payment.amount,
        });
      }
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

  // REQ057 (US-PAT-02) — the read-side assembler documents.service.ts's
  // invoice PDF renders. No prior method assembled a full GST invoice
  // shape (invoiceDetailsForSuccess() only computes GST fields at the
  // moment a payment succeeds, a write-time concern) — built fresh here,
  // reading directly off the already-stored GST columns rather than
  // re-deriving them. Only a succeeded payment has a real invoice; a
  // pending/failed row never gets an invoice_number at all (this table's
  // own established convention, see the schema comment on
  // AppointmentPayments.invoice_number).
  async invoiceForDownload(paymentId: string, user: JwtPayload) {
    const payment = await this.prisma.appointmentPayments.findUnique({
      where: { id: paymentId },
      include: {
        appointment: { include: { product: true } },
        patient: true,
        clinic: { include: { client_organization: true } },
        tenders: true,
      },
    });
    if (!payment || !isSameOrg(user, payment.client_org_id)) {
      return null;
    }
    if (user.roles.includes('patient') && payment.patient_id !== (user.patient_id ?? '__no_patient_link__')) {
      return null;
    }
    if (payment.status !== 'succeeded') {
      return null;
    }
    return {
      invoice_number: payment.invoice_number,
      created_at: payment.created_at,
      amount: PAISE_TO_RUPEES(payment.amount),
      currency: payment.currency,
      gst: {
        gstin: payment.gstin ?? undefined,
        hsn_sac_code: payment.hsn_sac_code ?? undefined,
        gst_rate: payment.gst_rate ?? undefined,
        cgst_amount: payment.cgst_amount != null ? PAISE_TO_RUPEES(payment.cgst_amount) : undefined,
        sgst_amount: payment.sgst_amount != null ? PAISE_TO_RUPEES(payment.sgst_amount) : undefined,
        igst_amount: payment.igst_amount != null ? PAISE_TO_RUPEES(payment.igst_amount) : undefined,
        place_of_supply: payment.place_of_supply ?? undefined,
      },
      clinic: {
        name: payment.clinic.client_organization?.name ?? payment.clinic.name,
        contact_phone: payment.clinic.client_organization?.contact_phone ?? undefined,
        // REQ139 — logo_url only exists on ClientOrganizations, so a
        // clinic predating org linkage (no client_organization row) has
        // none, same as its name/contact_phone above already fall back.
        logo_url: payment.clinic.client_organization?.logo_url ?? undefined,
      },
      patient: {
        full_name: `${payment.patient.first_name} ${payment.patient.last_name}`,
      },
      product_name: payment.appointment.product?.name,
      tenders: payment.tenders.map((t) => ({
        tender_type: t.tender_type,
        amount: PAISE_TO_RUPEES(t.amount),
        reference: t.reference ?? undefined,
      })),
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

  // REQ176 -- appointments/detail.jsx's own "Request Refund" affordance:
  // does a real succeeded, not-already-refunded payment exist for this
  // appointment at all? Delegated to loadScoped-style org checking via the
  // appointment's own clinic, not re-derived.
  async paymentsForAppointment(appointmentId: string, user: JwtPayload) {
    const appointment = await this.prisma.appointments.findUnique({ where: { id: appointmentId }, include: { clinic: true } });
    if (!appointment || !isSameOrg(user, appointment.clinic.client_org_id)) return [];
    const rows = await this.prisma.appointmentPayments.findMany({
      where: { appointment_id: appointmentId },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      amount: PAISE_TO_RUPEES(r.amount),
      refund_status: r.refund_status,
      created_at: r.created_at,
    }));
  }

  // REQ176 -- requested_amount is always computed here, server-side, via
  // the cancellation-fee policy engine against the appointment's real
  // cancellation timestamp -- never a client-supplied argument, mirroring
  // createRazorpayOrder's own "amount is never client-supplied" rule.
  async requestRefund(input: RequestRefundInput, user: JwtPayload) {
    const payment = await this.prisma.appointmentPayments.findUnique({
      where: { id: input.appointment_payment_id },
      include: { clinic: true, appointment: true },
    });
    if (!payment) return { success: false, message: 'Payment not found' };
    if (!isSameOrg(user, payment.client_org_id)) return { success: false, message: 'Payment not found' };
    if (payment.status !== 'succeeded') return { success: false, message: 'Only a succeeded payment can be refunded' };
    if (payment.refund_status !== 'none' && payment.refund_status !== 'rejected') {
      return { success: false, message: 'A refund has already been requested for this payment' };
    }
    // REQ176's own acceptance criteria (US-PAY-03) scope this mutation to a
    // cancelled appointment's payment -- the frontend already only offers
    // "Request Refund" in that state (appointments/detail.jsx). Enforced
    // here too, not just in the UI: without this check, a payment on an
    // appointment that's merely 'completed'/'no_show'/still 'confirmed'
    // could be refunded through the exact same path, and the ruleType
    // derivation below would silently fall through to 'reschedule' fee
    // rules for an appointment that was never rescheduled at all -- a real
    // bug found on re-review, not a defended design choice. A genuine
    // reschedule's own fee is charged proactively at reschedule time
    // (AppointmentsService#update(), REQ177), never recovered via this
    // refund-request path.
    if (payment.appointment.status !== 'cancelled') {
      return { success: false, message: 'Only a cancelled appointment\'s payment can be refunded through this action' };
    }

    // The appointment's own updated_at is the best available approximation
    // of "when the cancellation actually happened" -- this schema doesn't
    // carry a dedicated cancelled_at timestamp (only cancellation_reason, a
    // free-text field), and updated_at is the last time the row's status
    // genuinely changed.
    const cancelledAt = payment.appointment.updated_at;
    const hoursBefore = hoursBetween(cancelledAt, payment.appointment.appointment_time);
    const rules = await this.cancellationRules.findActiveRulesForOrg(payment.client_org_id, 'cancellation');
    const rule = selectApplicableRule(rules, payment.appointment.product_id, payment.clinic_id);
    const { refundAmount } = computeCancellationFee(rule, payment.amount, hoursBefore);

    const request = await this.prisma.refundRequests.create({
      data: {
        appointment_payment_id: payment.id,
        clinic_id: payment.clinic_id,
        client_org_id: payment.client_org_id,
        requested_by_user_id: user.sub,
        requested_amount: refundAmount,
        reason: input.reason,
      },
    });
    await this.prisma.appointmentPayments.update({ where: { id: payment.id }, data: { refund_status: 'requested' } });
    return { success: true, request_id: request.id };
  }

  // Optional clinicId, same dual-mode shape as discountApprovalRequests()
  // just above (an omitted clinicId scopes across the caller's whole org
  // via orgScope() directly, never a separate per-clinic existence check)
  // -- matches the tenancy matrix's generic no-required-args CASES shape.
  async myClinicRefundRequests(clinicId: string | undefined, user: JwtPayload) {
    const rows = await this.prisma.refundRequests.findMany({
      where: { ...(clinicId ? { clinic_id: clinicId } : {}), ...orgScope(user) },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      appointment_payment_id: r.appointment_payment_id,
      requested_amount: PAISE_TO_RUPEES(r.requested_amount),
      reason: r.reason,
      status: r.status,
      created_at: r.created_at,
      decided_at: r.decided_at ?? undefined,
      requested_by_user_id: r.requested_by_user_id,
      decided_by_user_id: r.decided_by_user_id ?? undefined,
    }));
  }

  // REQ176 -- mirrors decideDiscountApproval() exactly, including its
  // "the requester can never approve their own request, even if they also
  // hold a manager+ role" rule -- the whole point of the control is a
  // genuinely second party reviewing it.
  async decideRefundRequest(input: DecideRefundRequestInput, user: JwtPayload) {
    const request = await this.prisma.refundRequests.findUnique({
      where: { id: input.request_id },
      include: { appointment_payment: true },
    });
    if (!request) return { success: false, message: 'Refund request not found' };
    if (!isSameOrg(user, request.client_org_id)) return { success: false, message: 'Refund request not found' };
    if (request.status !== 'pending') return { success: false, message: 'This refund request has already been decided' };
    if (request.requested_by_user_id === user.sub) return { success: false, message: 'Cannot approve your own refund request' };

    if (input.decision === 'reject') {
      // Callback form, matching every other $transaction call in this
      // service (createRazorpayOrder/recordCounterPayment above) -- the
      // array form works against real Prisma too, but this file's own
      // mocked-prisma test convention only stubs the callback shape.
      await this.prisma.$transaction(async (tx) => {
        await tx.refundRequests.update({ where: { id: request.id }, data: { status: 'rejected', decided_by_user_id: user.sub, decided_at: new Date() } });
        await tx.appointmentPayments.update({ where: { id: request.appointment_payment_id }, data: { refund_status: 'rejected' } });
      });
      return { success: true, request_id: request.id };
    }

    const payment = request.appointment_payment;
    const gatewayPaymentId = payment.gateway_payment_id ?? payment.razorpay_payment_id;
    if (!gatewayPaymentId) {
      return { success: false, message: 'This payment has no gateway reference to refund against (was it a counter payment?)' };
    }

    // REQ175/176 -- a clinic has exactly ONE active gateway configured at a
    // time (PaymentGatewayConfig.clinic_id is unique) -- getActiveConfigForClinic
    // always resolves whatever is CURRENTLY configured, which is not
    // necessarily the gateway that actually captured this payment
    // (payment.gateway, stamped at capture time). If the clinic has since
    // switched providers, the credentials that captured this payment were
    // overwritten in place by updateConfig()'s own upsert -- calling the
    // now-active provider's .refund() with an id it never issued would
    // misroute the request to the wrong vendor's API entirely. Checked and
    // rejected here, BEFORE the state transition below, so a mismatch never
    // strands the payment in 'processing' with no way to retry (requestRefund's
    // own guard only allows a fresh request from 'none'/'rejected').
    const { provider, credentials } = await this.paymentGatewayConfig.getActiveConfigForClinic(payment.clinic_id);
    if (provider.id !== payment.gateway) {
      return {
        success: false,
        message: `This payment was captured via ${payment.gateway}, but the clinic's active gateway is now ${provider.id} -- reconfigure ${payment.gateway} temporarily to process this refund.`,
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.refundRequests.update({ where: { id: request.id }, data: { status: 'approved', decided_by_user_id: user.sub, decided_at: new Date() } });
      await tx.appointmentPayments.update({ where: { id: payment.id }, data: { refund_status: 'processing', refund_amount: request.requested_amount, refund_reason: request.reason } });
    });

    const result = await provider.refund(credentials, {
      gatewayPaymentId,
      gatewayOrderId: payment.gateway_order_id ?? payment.razorpay_order_id ?? undefined,
      amountPaise: request.requested_amount,
    });
    if (!result.success) {
      await this.prisma.appointmentPayments.update({ where: { id: payment.id }, data: { refund_status: 'failed' } });
      return { success: false, message: result.error ?? 'Refund failed at the gateway', request_id: request.id };
    }
    // Razorpay's own refund.processed webhook is what actually marks a row
    // 'refunded' (matching payment.captured's own webhook-is-authoritative
    // pattern) -- the other three gateways' refund APIs are synchronous, so
    // marking it here for those is correct; Razorpay's own eventual webhook
    // re-writing the same 'refunded' state on top is a harmless no-op.
    await this.prisma.appointmentPayments.update({
      where: { id: payment.id },
      data: provider.id === 'razorpay'
        ? { gateway_refund_id: result.gatewayRefundId }
        : { refund_status: 'refunded', refunded_at: new Date(), gateway_refund_id: result.gatewayRefundId },
    });
    return { success: true, request_id: request.id };
  }

  // REQ175 -- unlike Razorpay's single platform-wide webhook secret (env
  // var), each clinic now has its own gateway credentials, so the correct
  // secret to verify against can't be known before the event is at least
  // PARSED. Parsing untrusted data to route a lookup is safe -- it grants
  // no capability by itself; only after the signature is verified against
  // the SPECIFIC clinic's own credentials (resolved from that lookup) is
  // the event actually applied. A gatewayOrderId that doesn't resolve to a
  // real payment row is rejected before any credential lookup at all.
  async verifyAndApplyGatewayEvent(gateway: string, rawBody: Buffer, headers: Record<string, string | string[] | undefined>) {
    const provider = getProvider(gateway);
    if (!provider) {
      await this.logWebhookAudit(null, `${gateway}_webhook`, 'unknown_gateway', {});
      throw new BadRequestException(`Unknown gateway "${gateway}"`);
    }

    let event: NormalizedWebhookEvent;
    try {
      event = provider.parseWebhookEvent(rawBody);
    } catch {
      await this.logWebhookAudit(null, `${gateway}_webhook`, 'unparseable_body', {});
      throw new BadRequestException('Unparseable webhook body');
    }

    const routingId = event.gatewayOrderId ?? event.gatewayPaymentId;
    if (!routingId) {
      await this.logWebhookAudit(null, `${gateway}_webhook`, 'no_routing_id', { event: event.raw });
      return { acknowledged: true };
    }
    const payment = await this.prisma.appointmentPayments.findFirst({
      where: { gateway, OR: [{ gateway_order_id: routingId }, { gateway_payment_id: routingId }] },
    });
    if (!payment) {
      await this.logWebhookAudit(null, `${gateway}_webhook`, 'payment_not_found', { event: event.raw, routingId });
      return { acknowledged: true };
    }

    // Real bug found on re-review: getActiveConfigForClinic() always
    // resolves whatever gateway is CURRENTLY configured for this clinic --
    // not necessarily `gateway` (this webhook's own route, which the
    // `where: { gateway, ... }` lookup above already guarantees matches
    // payment.gateway). If the clinic has since switched providers, this
    // would hand a Cashfree-shaped credentials object into (say) Razorpay's
    // own verifyWebhookSignature(), which reads fields that simply don't
    // exist on it (e.g. credentials.webhook_secret undefined) -- Node's
    // crypto.createHmac throws a TypeError on an undefined key, an
    // unhandled crash for what's often just a legitimate, late-arriving
    // webhook from a gateway the clinic switched away from, not an attack.
    const { provider: configuredProvider, credentials } = await this.paymentGatewayConfig.getActiveConfigForClinic(payment.clinic_id);
    if (configuredProvider.id !== gateway) {
      await this.logWebhookAudit(payment.id, `${gateway}_webhook`, 'gateway_reconfigured', { event: event.raw });
      return { acknowledged: true };
    }
    let valid: boolean;
    try {
      valid = provider.verifyWebhookSignature(credentials, rawBody, headers);
    } catch {
      await this.logWebhookAudit(payment.id, `${gateway}_webhook`, 'signature_check_threw', {});
      throw new BadRequestException('Invalid webhook signature');
    }
    if (!valid) {
      await this.logWebhookAudit(payment.id, `${gateway}_webhook`, 'invalid_signature', {});
      throw new BadRequestException('Invalid webhook signature');
    }

    return this.applyGatewayEvent(gateway, event);
  }

  // REQ175 -- shared by the Cashfree/PayU/PhonePe webhook controllers
  // (gateway-webhooks.controller.ts) so the captured/failed/refunded
  // state-transition logic lives in exactly one place regardless of which
  // gateway sent the event -- Razorpay keeps its own dedicated
  // handleRazorpayWebhook() above (a real, pre-existing, live-verified
  // path this refactor deliberately does not disturb), but a payment row
  // is a payment row regardless of which gateway captured it.
  async applyGatewayEvent(gateway: string, event: NormalizedWebhookEvent) {
    await this.logWebhookAudit(null, `${gateway}_webhook`, event.type, { event: event.raw });

    if (event.type === 'ignored') return { acknowledged: true };

    if (event.type === 'payment_captured' || event.type === 'payment_failed') {
      if (!event.gatewayOrderId) return { acknowledged: true };
      const payment = await this.prisma.appointmentPayments.findFirst({ where: { gateway_order_id: event.gatewayOrderId, gateway } });
      if (!payment) return { acknowledged: true };

      if (event.type === 'payment_captured' && payment.status !== 'succeeded') {
        const invoiceDetails = await this.invoiceDetailsForSuccess(payment.clinic_id, payment.appointment_id, payment.amount);
        await this.prisma.appointmentPayments.update({
          where: { id: payment.id },
          data: { status: 'succeeded', gateway_payment_id: event.gatewayPaymentId ?? payment.gateway_payment_id, ...invoiceDetails },
        });
        await this.confirmAppointmentIfAwaitingPayment(payment.appointment_id);
        if (payment.client_org_id) {
          await this.webhookDispatch.fireEvent(payment.client_org_id, 'payment.succeeded', { appointment_id: payment.appointment_id, amount: payment.amount });
        }
      } else if (event.type === 'payment_failed' && payment.status === 'pending') {
        await this.prisma.appointmentPayments.update({ where: { id: payment.id }, data: { status: 'failed' } });
      }
      return { acknowledged: true };
    }

    if (event.type === 'refund_processed' || event.type === 'refund_failed') {
      if (!event.gatewayPaymentId) return { acknowledged: true };
      const payment = await this.prisma.appointmentPayments.findFirst({ where: { gateway_payment_id: event.gatewayPaymentId, gateway } });
      if (!payment) return { acknowledged: true };
      await this.prisma.appointmentPayments.update({
        where: { id: payment.id },
        data: {
          refund_status: event.type === 'refund_processed' ? 'refunded' : 'failed',
          refunded_at: event.type === 'refund_processed' ? new Date() : payment.refunded_at,
          gateway_refund_id: event.gatewayRefundId ?? payment.gateway_refund_id,
        },
      });
    }
    return { acknowledged: true };
  }
}
