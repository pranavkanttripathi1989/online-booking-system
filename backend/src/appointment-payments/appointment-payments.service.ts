import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { VerifyRazorpayPaymentInput } from './dto/appointment-payment.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

const RAZORPAY_ORDERS_URL = 'https://api.razorpay.com/v1/orders';

@Injectable()
export class AppointmentPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

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

    await this.prisma.appointmentPayments.update({
      where: { id: payment.id },
      data: {
        status: 'succeeded',
        razorpay_payment_id: input.razorpay_payment_id,
        razorpay_signature: input.razorpay_signature,
      },
    });
    return { success: true };
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
        ...(user.client_org_id ? { client_org_id: user.client_org_id } : {}),
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
}
