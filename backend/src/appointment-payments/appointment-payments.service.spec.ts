import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import { AppointmentPaymentsService } from './appointment-payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

const ORIGINAL_ENV = process.env;

describe('AppointmentPaymentsService', () => {
  let service: AppointmentPaymentsService;
  let prisma: {
    appointments: { findUnique: jest.Mock };
    appointmentPayments: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      aggregate: jest.Mock;
    };
    userProfiles: { findFirst: jest.Mock };
    auditLogs: { create: jest.Mock };
  };
  let fetchMock: jest.Mock;
  let notificationTrigger: { dispatch: jest.Mock };

  const orgUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u2', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV, RAZORPAY_KEY_ID: 'rzp_test_fake', RAZORPAY_KEY_SECRET: 'fake_secret' };
    prisma = {
      appointments: { findUnique: jest.fn() },
      appointmentPayments: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      userProfiles: { findFirst: jest.fn().mockResolvedValue(null) },
      auditLogs: { create: jest.fn() },
    };
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    notificationTrigger = { dispatch: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentPaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationTriggerService, useValue: notificationTrigger },
      ],
    }).compile();
    service = module.get(AppointmentPaymentsService);
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('createRazorpayOrder', () => {
    const appointment = {
      id: 'appt-1',
      patient_id: 'patient-1',
      clinic_id: 'clinic-a',
      clinic: { client_org_id: 'org-a' },
      product: { price: 50000 },
    };

    it('rejects a nonexistent appointment', async () => {
      prisma.appointments.findUnique.mockResolvedValue(null);
      await expect(service.createRazorpayOrder('nope')).rejects.toThrow('Appointment not found');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects an appointment with no priced product rather than defaulting to a fabricated amount', async () => {
      prisma.appointments.findUnique.mockResolvedValue({ ...appointment, product: null });
      await expect(service.createRazorpayOrder('appt-1')).rejects.toThrow(/no priced product/i);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('derives the order amount from the appointment\'s product price, never a client-supplied value', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'order_real123' }) });
      prisma.appointmentPayments.create.mockResolvedValue({});

      const result = await service.createRazorpayOrder('appt-1');

      const [, options] = fetchMock.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.amount).toBe(50000);
      expect(result.amount).toBe(50000);
      expect(result.razorpay_order_id).toBe('order_real123');
      expect(result.razorpay_key_id).toBe('rzp_test_fake');
    });

    it('stamps client_org_id from the appointment\'s clinic and creates a pending row', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'order_real123' }) });
      prisma.appointmentPayments.create.mockResolvedValue({});

      await service.createRazorpayOrder('appt-1');

      expect(prisma.appointmentPayments.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          appointment_id: 'appt-1',
          patient_id: 'patient-1',
          clinic_id: 'clinic-a',
          client_org_id: 'org-a',
          amount: 50000,
          status: 'pending',
          razorpay_order_id: 'order_real123',
        }),
      });
    });

    it('surfaces a Razorpay API error rather than silently creating a fake order', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: { description: 'Invalid key' } }) });
      await expect(service.createRazorpayOrder('appt-1')).rejects.toThrow('Invalid key');
      expect(prisma.appointmentPayments.create).not.toHaveBeenCalled();
    });
  });

  describe('verifyRazorpayPayment — real HMAC verification', () => {
    const pendingPayment = { id: 'pay-1', razorpay_order_id: 'order_1', status: 'pending', patient_id: 'pat-1', amount: 49900 };

    const validSignatureFor = (orderId: string, paymentId: string, secret = 'fake_secret') =>
      crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

    it('accepts a correctly-computed signature and marks the payment succeeded', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue(pendingPayment);
      prisma.appointmentPayments.update.mockResolvedValue({});
      const signature = validSignatureFor('order_1', 'pay_1');

      const result = await service.verifyRazorpayPayment({
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: signature,
      });

      expect(result.success).toBe(true);
      expect(prisma.appointmentPayments.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: { status: 'succeeded', razorpay_payment_id: 'pay_1', razorpay_signature: signature },
      });
    });

    // REQ008/PLAN017
    it('dispatches payment_received to the patient\'s linked profile on success', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue(pendingPayment);
      prisma.appointmentPayments.update.mockResolvedValue({});
      prisma.userProfiles.findFirst.mockResolvedValue({ id: 'profile-pat-1' });
      const signature = validSignatureFor('order_1', 'pay_1');

      await service.verifyRazorpayPayment({
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: signature,
      });

      expect(notificationTrigger.dispatch).toHaveBeenCalledWith(
        'profile-pat-1',
        'payment_received',
        expect.objectContaining({ type: 'payment' }),
      );
    });

    it('does not dispatch on a failed (tampered signature) verification', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue(pendingPayment);
      prisma.appointmentPayments.update.mockResolvedValue({});
      await service.verifyRazorpayPayment({
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: 'deadbeef',
      });
      expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
    });

    it('rejects a tampered signature (wrong secret) and marks the payment failed, not succeeded', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue(pendingPayment);
      prisma.appointmentPayments.update.mockResolvedValue({});
      const tamperedSignature = validSignatureFor('order_1', 'pay_1', 'wrong_secret');

      const result = await service.verifyRazorpayPayment({
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: tamperedSignature,
      });

      expect(result.success).toBe(false);
      expect(prisma.appointmentPayments.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: { status: 'failed' },
      });
    });

    it('rejects a signature for a mismatched payment_id (replay against a different payment)', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue(pendingPayment);
      prisma.appointmentPayments.update.mockResolvedValue({});
      const signatureForDifferentPayment = validSignatureFor('order_1', 'pay_OTHER');

      const result = await service.verifyRazorpayPayment({
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: signatureForDifferentPayment,
      });

      expect(result.success).toBe(false);
    });

    it('rejects when no matching pending order exists', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue(null);
      const result = await service.verifyRazorpayPayment({
        razorpay_order_id: 'order_unknown',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: 'anything',
      });
      expect(result.success).toBe(false);
      expect(prisma.appointmentPayments.update).not.toHaveBeenCalled();
    });
  });

  describe('getTransactionsByDate — tenant isolation', () => {
    const row = {
      id: 'pay-1',
      created_at: new Date('2026-08-01'),
      amount: 8500,
      status: 'succeeded',
      patient: { id: 'patient-1', first_name: 'Jane', last_name: 'Doe' },
      appointment: {
        id: 'appt-1',
        clinician: { first_name: 'Dr', last_name: 'House' },
        product: { name: 'Consultation' },
      },
    };

    it('scopes to the caller org for a manager', async () => {
      prisma.appointmentPayments.findMany.mockResolvedValue([]);
      await service.getTransactionsByDate('2026-08-01', '2026-08-31', 10, 0, orgUser);
      expect(prisma.appointmentPayments.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
    });

    it('does not scope by org for a platform-wide caller', async () => {
      prisma.appointmentPayments.findMany.mockResolvedValue([]);
      await service.getTransactionsByDate('2026-08-01', '2026-08-31', 10, 0, platformUser);
      const callArg = prisma.appointmentPayments.findMany.mock.calls[0][0];
      expect(callArg.where.client_org_id).toBeUndefined();
    });

    it('converts amount to rupees and matches manager/Dashboard.jsx\'s exact camelCase shape', async () => {
      prisma.appointmentPayments.findMany.mockResolvedValue([row]);
      const [result] = await service.getTransactionsByDate('2026-08-01', '2026-08-31', 10, 0, orgUser);
      expect(result.amount).toBe(85);
      expect(result.createdAt).toEqual(row.created_at);
      expect(result.appointment.clinician.name).toBe('Dr House');
      expect(result.appointment.patient.firstName).toBe('Jane');
      expect(result.appointment.patient.lastName).toBe('Doe');
      expect(result.appointment.product?.name).toBe('Consultation');
    });
  });

  describe('myFinanceTransactions — tenant isolation', () => {
    const row = {
      id: 'pay-1',
      created_at: new Date('2026-08-01'),
      amount: 8500,
      status: 'succeeded',
      patient: { first_name: 'Jane', last_name: 'Doe' },
      appointment: { product: { name: 'Consultation' } },
    };

    it('scopes to the caller org for a manager', async () => {
      prisma.appointmentPayments.findMany.mockResolvedValue([]);
      await service.myFinanceTransactions('2026-08-01', '2026-08-31', orgUser);
      expect(prisma.appointmentPayments.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
    });

    it('does not scope by org for a platform-wide caller', async () => {
      prisma.appointmentPayments.findMany.mockResolvedValue([]);
      await service.myFinanceTransactions('2026-08-01', '2026-08-31', platformUser);
      const callArg = prisma.appointmentPayments.findMany.mock.calls[0][0];
      expect(callArg.where.client_org_id).toBeUndefined();
    });

    it('converts amount to rupees, composes patient_name, and reports Razorpay as the method', async () => {
      prisma.appointmentPayments.findMany.mockResolvedValue([row]);
      const [result] = await service.myFinanceTransactions('2026-08-01', '2026-08-31', orgUser);
      expect(result.amount).toBe(85);
      expect(result.patient_name).toBe('Jane Doe');
      expect(result.product_name).toBe('Consultation');
      expect(result.method).toBe('Razorpay');
    });
  });

  describe('myFinanceSummary', () => {
    beforeEach(() => {
      prisma.appointmentPayments.findMany.mockResolvedValue([]);
      prisma.appointmentPayments.aggregate.mockResolvedValue({ _count: 0, _sum: { amount: null } });
      prisma.appointmentPayments.count.mockResolvedValue(0);
    });

    it('scopes every query to the caller org for a manager', async () => {
      await service.myFinanceSummary('2026-08-01', '2026-08-31', orgUser);
      const findManyCalls = prisma.appointmentPayments.findMany.mock.calls;
      const aggregateCall = prisma.appointmentPayments.aggregate.mock.calls[0][0];
      const countCalls = prisma.appointmentPayments.count.mock.calls;
      expect(findManyCalls.every(([arg]) => arg.where.client_org_id === 'org-a')).toBe(true);
      expect(aggregateCall.where.client_org_id).toBe('org-a');
      expect(countCalls.every(([arg]) => arg.where.client_org_id === 'org-a')).toBe(true);
    });

    it('does not scope by org for a platform-wide caller', async () => {
      await service.myFinanceSummary('2026-08-01', '2026-08-31', platformUser);
      const aggregateCall = prisma.appointmentPayments.aggregate.mock.calls[0][0];
      expect(aggregateCall.where.client_org_id).toBeUndefined();
    });

    it('sums this-calendar-month succeeded payments in rupees for revenue_this_month', async () => {
      prisma.appointmentPayments.findMany.mockImplementation((args: any) =>
        // "this month" query has gte with no lte; the date-range query has both.
        args.where.created_at?.gte && !args.where.created_at?.lte
          ? Promise.resolve([{ amount: 10000 }, { amount: 5000 }])
          : Promise.resolve([]),
      );
      const result = await service.myFinanceSummary('2026-08-01', '2026-08-31', orgUser);
      expect(result.revenue_this_month).toBe(150);
    });

    it('reports pending/succeeded/failed counts and pending_amount in rupees, distinct from analytics\' revenue metric', async () => {
      prisma.appointmentPayments.aggregate.mockResolvedValue({ _count: 3, _sum: { amount: 30000 } });
      prisma.appointmentPayments.count.mockResolvedValueOnce(7).mockResolvedValueOnce(2);
      const result = await service.myFinanceSummary('2026-08-01', '2026-08-31', orgUser);
      expect(result.pending_count).toBe(3);
      expect(result.pending_amount).toBe(300);
      expect(result.succeeded_count).toBe(7);
      expect(result.failed_count).toBe(2);
    });

    it('groups succeeded range payments by month, converted to rupees, in chronological order', async () => {
      prisma.appointmentPayments.findMany.mockImplementation((args: any) => {
        if (args.where.created_at?.gte && !args.where.created_at?.lte) return Promise.resolve([]); // this-month query
        return Promise.resolve([
          { amount: 10000, created_at: new Date('2026-07-15') },
          { amount: 5000, created_at: new Date('2026-08-05') },
          { amount: 5000, created_at: new Date('2026-08-20') },
        ]);
      });
      const result = await service.myFinanceSummary('2026-07-01', '2026-08-31', orgUser);
      expect(result.monthly).toEqual([
        { month: 'Jul 2026', revenue: 100 },
        { month: 'Aug 2026', revenue: 100 },
      ]);
    });
  });

  describe('handleRazorpayWebhook (REQ040)', () => {
    const webhookSecret = 'whsec_fake';
    function sign(body: string) {
      return crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
    }

    beforeEach(() => {
      process.env = { ...process.env, RAZORPAY_WEBHOOK_SECRET: webhookSecret };
    });

    it('rejects when RAZORPAY_WEBHOOK_SECRET is not configured, without touching the database', async () => {
      process.env.RAZORPAY_WEBHOOK_SECRET = '';
      const body = Buffer.from('{}');
      await expect(service.handleRazorpayWebhook(body, 'anything')).rejects.toThrow(/not configured/i);
      expect(prisma.appointmentPayments.findFirst).not.toHaveBeenCalled();
      expect(prisma.auditLogs.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ outcome: 'not_configured' }) }));
    });

    it('rejects a missing signature header', async () => {
      const body = Buffer.from('{}');
      await expect(service.handleRazorpayWebhook(body, undefined)).rejects.toThrow(/missing/i);
      expect(prisma.auditLogs.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ outcome: 'missing_signature' }) }));
    });

    it('rejects a tampered/incorrect signature, without touching the payment row', async () => {
      const body = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1' } } } }));
      await expect(service.handleRazorpayWebhook(body, sign('a different body'))).rejects.toThrow(/invalid.*signature/i);
      expect(prisma.appointmentPayments.findFirst).not.toHaveBeenCalled();
      expect(prisma.auditLogs.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ outcome: 'invalid_signature' }) }));
    });

    it('rejects an unparseable body even with a signature that matches its own (garbage) bytes', async () => {
      const body = Buffer.from('not json');
      await expect(service.handleRazorpayWebhook(body, sign('not json'))).rejects.toThrow(/unparseable/i);
    });

    it('acknowledges but ignores an event type this codebase does not act on (e.g. refund.processed)', async () => {
      const body = Buffer.from(JSON.stringify({ event: 'refund.processed', payload: {} }));
      const result = await service.handleRazorpayWebhook(body, sign(body.toString()));
      expect(result).toEqual({ acknowledged: true });
      expect(prisma.appointmentPayments.findFirst).not.toHaveBeenCalled();
      expect(prisma.auditLogs.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ outcome: 'ignored' }) }));
    });

    it('acknowledges a payment.captured event for an order this system has no record of', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue(null);
      const body = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', order_id: 'order_unknown' } } } }));
      const result = await service.handleRazorpayWebhook(body, sign(body.toString()));
      expect(result).toEqual({ acknowledged: true });
      expect(prisma.appointmentPayments.update).not.toHaveBeenCalled();
    });

    it('marks a pending payment succeeded on payment.captured, recording the real payment id', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue({ id: 'pay-row-1', status: 'pending', razorpay_payment_id: null });
      const body = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_real_1', order_id: 'order_1' } } } }));
      const result = await service.handleRazorpayWebhook(body, sign(body.toString()));
      expect(result).toEqual({ acknowledged: true });
      expect(prisma.appointmentPayments.update).toHaveBeenCalledWith({
        where: { id: 'pay-row-1' },
        data: { status: 'succeeded', razorpay_payment_id: 'pay_real_1' },
      });
    });

    it('is idempotent -- a payment.captured delivered twice for an already-succeeded row does not re-write it', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue({ id: 'pay-row-1', status: 'succeeded', razorpay_payment_id: 'pay_real_1' });
      const body = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_real_1', order_id: 'order_1' } } } }));
      await service.handleRazorpayWebhook(body, sign(body.toString()));
      expect(prisma.appointmentPayments.update).not.toHaveBeenCalled();
    });

    it('marks a pending payment failed on payment.failed', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue({ id: 'pay-row-1', status: 'pending' });
      const body = Buffer.from(JSON.stringify({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_real_1', order_id: 'order_1' } } } }));
      await service.handleRazorpayWebhook(body, sign(body.toString()));
      expect(prisma.appointmentPayments.update).toHaveBeenCalledWith({ where: { id: 'pay-row-1' }, data: { status: 'failed' } });
    });

    it('never regresses an already-succeeded row on a late payment.failed delivery', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue({ id: 'pay-row-1', status: 'succeeded' });
      const body = Buffer.from(JSON.stringify({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_real_1', order_id: 'order_1' } } } }));
      await service.handleRazorpayWebhook(body, sign(body.toString()));
      expect(prisma.appointmentPayments.update).not.toHaveBeenCalled();
    });
  });
});
