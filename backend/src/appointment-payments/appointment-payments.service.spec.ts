import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import { AppointmentPaymentsService } from './appointment-payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { WebhookDispatchService } from '../webhooks/webhook-dispatch.service';
import { BranchOverridesService } from '../branch-overrides/branch-overrides.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

const ORIGINAL_ENV = process.env;

describe('AppointmentPaymentsService', () => {
  let service: AppointmentPaymentsService;
  let prisma: {
    appointments: { findUnique: jest.Mock; update: jest.Mock };
    appointmentStatusLogs: { create: jest.Mock };
    appointmentPayments: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      aggregate: jest.Mock;
    };
    invoiceSequences: { upsert: jest.Mock };
    userProfiles: { findFirst: jest.Mock };
    auditLogs: { create: jest.Mock };
    paymentTenders: { createMany: jest.Mock; findMany: jest.Mock };
    patientPackages: { findUnique: jest.Mock; update: jest.Mock };
    clinics: { findUnique: jest.Mock };
    discountApprovalRequests: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    cashDrawerCloseouts: { create: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let fetchMock: jest.Mock;
  let notificationTrigger: { dispatch: jest.Mock };
  let webhookDispatch: { fireEvent: jest.Mock };
  let branchOverrides: { getForPricing: jest.Mock };

  const orgUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u2', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV, RAZORPAY_KEY_ID: 'rzp_test_fake', RAZORPAY_KEY_SECRET: 'fake_secret' };
    prisma = {
      appointments: { findUnique: jest.fn(), update: jest.fn() },
      appointmentStatusLogs: { create: jest.fn() },
      appointmentPayments: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      invoiceSequences: { upsert: jest.fn().mockResolvedValue({ last_number: 1 }) },
      userProfiles: { findFirst: jest.fn().mockResolvedValue(null) },
      auditLogs: { create: jest.fn() },
      paymentTenders: { createMany: jest.fn().mockResolvedValue({ count: 1 }), findMany: jest.fn().mockResolvedValue([]) },
      // REQ054 — redeemPackageSitting()
      patientPackages: { findUnique: jest.fn(), update: jest.fn() },
      // REQ056 — discount approval + cash close
      clinics: { findUnique: jest.fn() },
      discountApprovalRequests: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      cashDrawerCloseouts: { create: jest.fn(), findMany: jest.fn() },
      // REQ023 — recordCounterPayment()'s own transaction. Runs the callback
      // against the same top-level `prisma` mock (tx === prisma here), which
      // is fine since every model this transaction touches is already
      // mocked above -- matches the shape used elsewhere in this codebase's
      // specs for a $transaction(async (tx) => {...}) callback.
      $transaction: jest.fn((fn) => fn(prisma)),
    };
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    notificationTrigger = { dispatch: jest.fn() };
    webhookDispatch = { fireEvent: jest.fn() };
    // REQ055 — defaults to null (no branch override row) everywhere, so
    // every pre-existing test's expected amount is unaffected unless a
    // test explicitly mocks a different return.
    branchOverrides = { getForPricing: jest.fn().mockResolvedValue(null) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentPaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationTriggerService, useValue: notificationTrigger },
        { provide: WebhookDispatchService, useValue: webhookDispatch },
        { provide: BranchOverridesService, useValue: branchOverrides },
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

    // REQ055 (US-ORG-05).
    it('charges the branch override price, not the org-master price, when the branch overrode it', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      branchOverrides.getForPricing.mockResolvedValue({ mode: 'override', override_price: 30000 });
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'order_real123' }) });
      prisma.appointmentPayments.create.mockResolvedValue({});

      const result = await service.createRazorpayOrder('appt-1');

      expect(result.amount).toBe(30000);
    });

    it('rejects rather than charges when the branch has skipped this service entirely', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      branchOverrides.getForPricing.mockResolvedValue({ mode: 'skip' });

      await expect(service.createRazorpayOrder('appt-1')).rejects.toThrow(/no priced product/i);
      expect(fetchMock).not.toHaveBeenCalled();
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

    // REQ016 (US-CAT-04) — the actual charge-determining site now routes
    // through the shared resolveServicePrice() helper (channel: 'online',
    // since a Razorpay checkout IS the online channel) instead of reading
    // product.price directly — this is the fix for the display-vs-charge
    // inconsistency risk this requirement's own research flagged.
    it('charges the patient-category rate when the caller is tagged with a matching category', async () => {
      prisma.appointments.findUnique.mockResolvedValue({
        ...appointment,
        product: { price: 50000, category_pricing_json: { corporate: 35000 } },
        patient: { patient_category: 'corporate' },
      });
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'order_real123' }) });
      prisma.appointmentPayments.create.mockResolvedValue({});

      const result = await service.createRazorpayOrder('appt-1');

      const [, options] = fetchMock.mock.calls[0];
      expect(JSON.parse(options.body).amount).toBe(35000);
      expect(result.amount).toBe(35000);
    });

    it('charges the online-channel rate when no category override applies', async () => {
      prisma.appointments.findUnique.mockResolvedValue({
        ...appointment,
        product: { price: 50000, channel_pricing_json: { online: 45000, walkin: 55000 } },
        patient: { patient_category: null },
      });
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'order_real123' }) });
      prisma.appointmentPayments.create.mockResolvedValue({});

      const result = await service.createRazorpayOrder('appt-1');

      expect(result.amount).toBe(45000); // 'online', never the 'walkin' rate
    });

    it('includes the patient relation so category overrides can be resolved', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'order_real123' }) });
      prisma.appointmentPayments.create.mockResolvedValue({});

      await service.createRazorpayOrder('appt-1');

      expect(prisma.appointments.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ include: expect.objectContaining({ patient: true }) }),
      );
    });
  });

  describe('verifyRazorpayPayment — real HMAC verification', () => {
    const pendingPayment = {
      id: 'pay-1',
      razorpay_order_id: 'order_1',
      status: 'pending',
      patient_id: 'pat-1',
      amount: 49900,
      clinic_id: 'clinic-1',
      appointment_id: 'appt-1',
    };

    const validSignatureFor = (orderId: string, paymentId: string, secret = 'fake_secret') =>
      crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

    it('accepts a correctly-computed signature and marks the payment succeeded', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue(pendingPayment);
      prisma.appointmentPayments.update.mockResolvedValue({});
      prisma.appointments.findUnique.mockResolvedValue({ product: null });
      const signature = validSignatureFor('order_1', 'pay_1');

      const result = await service.verifyRazorpayPayment({
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: signature,
      });

      expect(result.success).toBe(true);
      expect(prisma.appointmentPayments.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: expect.objectContaining({
          status: 'succeeded',
          razorpay_payment_id: 'pay_1',
          razorpay_signature: signature,
          invoice_number: expect.stringMatching(/^INV\/\d{4}-\d{2}\/CLINIC-1\/00001$/),
        }),
      });
    });

    // REQ018 (US-BOOK-03) / REQ030 (US-INT-02, scoped down).
    it('confirms an awaiting_payment appointment and fires appointment.confirmed + payment.succeeded webhooks', async () => {
      const paymentWithOrg = { ...pendingPayment, client_org_id: 'org-a' };
      prisma.appointmentPayments.findFirst.mockResolvedValue(paymentWithOrg);
      prisma.appointmentPayments.update.mockResolvedValue({});
      prisma.appointments.findUnique.mockResolvedValue({ product: null, status: 'awaiting_payment', clinic: { client_org_id: 'org-a' } });
      prisma.appointments.update.mockResolvedValue({});
      const signature = validSignatureFor('order_1', 'pay_1');

      await service.verifyRazorpayPayment({ razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: signature });

      expect(prisma.appointments.update).toHaveBeenCalledWith({ where: { id: 'appt-1' }, data: { status: 'confirmed' } });
      expect(prisma.appointmentStatusLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ appointment_id: 'appt-1', status: 'confirmed' }) }),
      );
      expect(webhookDispatch.fireEvent).toHaveBeenCalledWith('org-a', 'appointment.confirmed', expect.objectContaining({ appointment_id: 'appt-1' }));
      expect(webhookDispatch.fireEvent).toHaveBeenCalledWith('org-a', 'payment.succeeded', expect.anything());
    });

    it('is a no-op on an already-confirmed appointment — never re-confirms or re-fires', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue(pendingPayment);
      prisma.appointmentPayments.update.mockResolvedValue({});
      prisma.appointments.findUnique.mockResolvedValue({ product: null, status: 'confirmed', clinic: { client_org_id: 'org-a' } });
      const signature = validSignatureFor('order_1', 'pay_1');

      await service.verifyRazorpayPayment({ razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: signature });

      expect(prisma.appointments.update).not.toHaveBeenCalled();
      expect(webhookDispatch.fireEvent).not.toHaveBeenCalledWith(expect.anything(), 'appointment.confirmed', expect.anything());
    });

    // REQ047 (US-BIL-09) -- a confirmed-exempt product (REQ046) gets real
    // zeros, not just a stored invoice number.
    it('zeroes GST amounts for a confirmed tax-exempt product and copies its HSN', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue(pendingPayment);
      prisma.appointmentPayments.update.mockResolvedValue({});
      prisma.appointments.findUnique.mockResolvedValue({ product: { hsn: '9993', is_tax_exempt: true } });
      const signature = validSignatureFor('order_1', 'pay_1');

      await service.verifyRazorpayPayment({
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: signature,
      });

      expect(prisma.appointmentPayments.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: expect.objectContaining({
          hsn_sac_code: '9993',
          gst_rate: 0,
          cgst_amount: 0,
          sgst_amount: 0,
          igst_amount: 0,
        }),
      });
    });

    // A non-exempt product has no real GST rate anywhere in this schema to
    // source from (Products has no gst_rate column, no org-level GSTIN
    // config table) -- leaving these null is the honest behavior, not a
    // bug: asserting it here pins that decision against an accidental
    // future "just default to 18%" fix.
    it('leaves GST amount fields null for a non-exempt product rather than guessing a rate', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue(pendingPayment);
      prisma.appointmentPayments.update.mockResolvedValue({});
      prisma.appointments.findUnique.mockResolvedValue({ product: { hsn: '3004', is_tax_exempt: false } });
      const signature = validSignatureFor('order_1', 'pay_1');

      await service.verifyRazorpayPayment({
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: signature,
      });

      const data = prisma.appointmentPayments.update.mock.calls[0][0].data;
      expect(data.hsn_sac_code).toBe('3004');
      expect(data.gst_rate).toBeUndefined();
      expect(data.cgst_amount).toBeUndefined();
    });

    // REQ101 — closes the gap the two tests above pinned as "honest,
    // not yet fixed" (2026-08-24). Both product.gst_rate and clinic.gstin
    // must be set for the split to populate.
    it('populates a real CGST+SGST split once both gst_rate and clinic gstin are configured', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue({ ...pendingPayment, amount: 100000 });
      prisma.appointmentPayments.update.mockResolvedValue({});
      prisma.appointments.findUnique.mockResolvedValue({ product: { hsn: '9993', is_tax_exempt: false, gst_rate: 18 } });
      prisma.clinics.findUnique.mockResolvedValue({ gstin: '27ABCDE1234F1Z5', state: 'Maharashtra' });
      const signature = validSignatureFor('order_1', 'pay_1');

      await service.verifyRazorpayPayment({
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: signature,
      });

      expect(prisma.appointmentPayments.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: expect.objectContaining({
          gst_rate: 18,
          gstin: '27ABCDE1234F1Z5',
          place_of_supply: 'Maharashtra',
          cgst_amount: 9000,
          sgst_amount: 9000,
          igst_amount: 0,
        }),
      });
    });

    it('leaves GST fields null when gst_rate is set but the clinic has no gstin configured', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue({ ...pendingPayment, amount: 100000 });
      prisma.appointmentPayments.update.mockResolvedValue({});
      prisma.appointments.findUnique.mockResolvedValue({ product: { hsn: '9993', is_tax_exempt: false, gst_rate: 18 } });
      prisma.clinics.findUnique.mockResolvedValue({ gstin: null, state: null });
      const signature = validSignatureFor('order_1', 'pay_1');

      await service.verifyRazorpayPayment({
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: signature,
      });

      const data = prisma.appointmentPayments.update.mock.calls[0][0].data;
      expect(data.gst_rate).toBeUndefined();
      expect(data.cgst_amount).toBeUndefined();
    });

    it('leaves GST fields null when the clinic has a gstin but the product has no gst_rate', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue({ ...pendingPayment, amount: 100000 });
      prisma.appointmentPayments.update.mockResolvedValue({});
      prisma.appointments.findUnique.mockResolvedValue({ product: { hsn: '9993', is_tax_exempt: false, gst_rate: null } });
      prisma.clinics.findUnique.mockResolvedValue({ gstin: '27ABCDE1234F1Z5', state: 'Maharashtra' });
      const signature = validSignatureFor('order_1', 'pay_1');

      await service.verifyRazorpayPayment({
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: signature,
      });

      const data = prisma.appointmentPayments.update.mock.calls[0][0].data;
      expect(data.gst_rate).toBeUndefined();
      expect(data.cgst_amount).toBeUndefined();
    });

    it('rounds an odd paise amount without losing a paise across the cgst+sgst split', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue({ ...pendingPayment, amount: 100001 });
      prisma.appointmentPayments.update.mockResolvedValue({});
      prisma.appointments.findUnique.mockResolvedValue({ product: { hsn: '9993', is_tax_exempt: false, gst_rate: 18 } });
      prisma.clinics.findUnique.mockResolvedValue({ gstin: '27ABCDE1234F1Z5', state: 'Maharashtra' });
      const signature = validSignatureFor('order_1', 'pay_1');

      await service.verifyRazorpayPayment({
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: signature,
      });

      const data = prisma.appointmentPayments.update.mock.calls[0][0].data;
      // 100001 * 18 / 100 = 18000.18 total tax; half = 9000.09, rounds to 9000 each side.
      expect(data.cgst_amount).toBe(9000);
      expect(data.sgst_amount).toBe(9000);
    });

    // Each clinic's numbering is independent and gapless -- a second
    // invoice for the same clinic/financial-year increments rather than
    // restarting or colliding.
    it('assigns a gapless, incrementing invoice number per clinic via upsert', async () => {
      prisma.appointmentPayments.findFirst.mockResolvedValue(pendingPayment);
      prisma.appointmentPayments.update.mockResolvedValue({});
      prisma.appointments.findUnique.mockResolvedValue({ product: null });
      prisma.invoiceSequences.upsert.mockResolvedValue({ last_number: 7 });
      const signature = validSignatureFor('order_1', 'pay_1');

      await service.verifyRazorpayPayment({
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: signature,
      });

      expect(prisma.invoiceSequences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinic_id_series_financial_year: expect.objectContaining({ clinic_id: 'clinic-1', series: 'APPT' }) },
          update: { last_number: { increment: 1 } },
        }),
      );
      const data = prisma.appointmentPayments.update.mock.calls[0][0].data;
      expect(data.invoice_number).toMatch(/00007$/);
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

  // REQ057 (US-PAT-02) — the read-side assembler documents.service.ts's
  // invoice PDF renders.
  describe('invoiceForDownload', () => {
    const managerUser: JwtPayload = { sub: 'mgr-1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
    const patientUser: JwtPayload = { sub: 'pat-1', roles: ['patient'], client_org_id: 'org-a', patient_id: 'patient-1', clinician_id: null } as JwtPayload;
    const succeededPayment = {
      id: 'pay-1',
      status: 'succeeded',
      client_org_id: 'org-a',
      patient_id: 'patient-1',
      invoice_number: 'INV/1',
      created_at: new Date('2026-08-25T00:00:00.000Z'),
      amount: 50000,
      currency: 'INR',
      gstin: null,
      hsn_sac_code: null,
      gst_rate: null,
      cgst_amount: null,
      sgst_amount: null,
      igst_amount: null,
      place_of_supply: null,
      appointment: { product: { name: 'GP Consultation' } },
      patient: { first_name: 'Sarah', last_name: 'Mitchell' },
      clinic: { name: 'MG Road Clinic', client_organization: { name: 'MG Road Clinic', contact_phone: '+911234', logo_url: '/uploads/branding/org-a-logo.png' } },
      tenders: [{ tender_type: 'cash', amount: 50000, reference: null }],
    };

    it('returns null for a nonexistent payment', async () => {
      prisma.appointmentPayments.findUnique.mockResolvedValue(null);
      expect(await service.invoiceForDownload('nope', managerUser)).toBeNull();
    });

    it('returns null for a cross-org payment (never confirms cross-tenant existence)', async () => {
      prisma.appointmentPayments.findUnique.mockResolvedValue({ ...succeededPayment, client_org_id: 'org-b' });
      expect(await service.invoiceForDownload('pay-1', managerUser)).toBeNull();
    });

    it('returns null for a patient caller requesting a different patient\'s invoice', async () => {
      prisma.appointmentPayments.findUnique.mockResolvedValue({ ...succeededPayment, patient_id: 'someone-else' });
      expect(await service.invoiceForDownload('pay-1', patientUser)).toBeNull();
    });

    it('returns null for a payment that never succeeded (no real invoice exists)', async () => {
      prisma.appointmentPayments.findUnique.mockResolvedValue({ ...succeededPayment, status: 'pending' });
      expect(await service.invoiceForDownload('pay-1', managerUser)).toBeNull();
    });

    it('assembles the invoice, converting paise to rupees', async () => {
      prisma.appointmentPayments.findUnique.mockResolvedValue(succeededPayment);
      const result = await service.invoiceForDownload('pay-1', managerUser);
      expect(result).toEqual({
        invoice_number: 'INV/1',
        created_at: succeededPayment.created_at,
        amount: 500,
        currency: 'INR',
        gst: { gstin: undefined, hsn_sac_code: undefined, gst_rate: undefined, cgst_amount: undefined, sgst_amount: undefined, igst_amount: undefined, place_of_supply: undefined },
        // REQ139 — logo_url passed through for the PDF letterhead.
        clinic: { name: 'MG Road Clinic', contact_phone: '+911234', logo_url: '/uploads/branding/org-a-logo.png' },
        patient: { full_name: 'Sarah Mitchell' },
        product_name: 'GP Consultation',
        tenders: [{ tender_type: 'cash', amount: 500, reference: undefined }],
      });
    });

    it('the patient owning the payment can download their own invoice', async () => {
      prisma.appointmentPayments.findUnique.mockResolvedValue(succeededPayment);
      const result = await service.invoiceForDownload('pay-1', patientUser);
      expect(result).not.toBeNull();
    });

    // REQ139
    it('falls back to no logo_url when the org has never uploaded one', async () => {
      prisma.appointmentPayments.findUnique.mockResolvedValue({
        ...succeededPayment,
        clinic: { name: 'MG Road Clinic', client_organization: { name: 'MG Road Clinic', contact_phone: '+911234', logo_url: null } },
      });
      const result = await service.invoiceForDownload('pay-1', managerUser);
      expect(result?.clinic.logo_url).toBeUndefined();
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
      prisma.appointmentPayments.findFirst.mockResolvedValue({
        id: 'pay-row-1',
        status: 'pending',
        razorpay_payment_id: null,
        clinic_id: 'clinic-1',
        appointment_id: 'appt-1',
      });
      prisma.appointments.findUnique.mockResolvedValue({ product: null });
      const body = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_real_1', order_id: 'order_1' } } } }));
      const result = await service.handleRazorpayWebhook(body, sign(body.toString()));
      expect(result).toEqual({ acknowledged: true });
      expect(prisma.appointmentPayments.update).toHaveBeenCalledWith({
        where: { id: 'pay-row-1' },
        data: expect.objectContaining({
          status: 'succeeded',
          razorpay_payment_id: 'pay_real_1',
          invoice_number: expect.stringMatching(/^INV\//),
        }),
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

  // REQ023 (US-BIL-01, scoped subset) — mixed-tender counter billing.
  describe('recordCounterPayment', () => {
    const staffUser: JwtPayload = { sub: 'staff-1', roles: ['staff'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
    const appointment = {
      id: 'appt-1',
      patient_id: 'patient-1',
      clinic_id: 'clinic-a',
      clinic: { client_org_id: 'org-a' },
      product: { price: 50000 }, // ₹500.00
      patient: { patient_category: null },
    };

    it('rejects a nonexistent appointment', async () => {
      prisma.appointments.findUnique.mockResolvedValue(null);
      await expect(
        service.recordCounterPayment({ appointment_id: 'nope', tenders: [{ tender_type: 'cash', amount: 500 }] } as any, staffUser),
      ).rejects.toThrow('Appointment not found');
    });

    it('rejects a cross-org appointment (never confirms cross-tenant existence)', async () => {
      prisma.appointments.findUnique.mockResolvedValue({ ...appointment, clinic: { client_org_id: 'org-b' } });
      await expect(
        service.recordCounterPayment({ appointment_id: 'appt-1', tenders: [{ tender_type: 'cash', amount: 500 }] } as any, staffUser),
      ).rejects.toThrow('Appointment not found');
      expect(prisma.appointmentPayments.create).not.toHaveBeenCalled();
    });

    it('rejects an appointment with no priced product', async () => {
      prisma.appointments.findUnique.mockResolvedValue({ ...appointment, product: null });
      await expect(
        service.recordCounterPayment({ appointment_id: 'appt-1', tenders: [{ tender_type: 'cash', amount: 500 }] } as any, staffUser),
      ).rejects.toThrow(/no priced product/i);
    });

    // REQ055 (US-ORG-05).
    it('requires tenders to match the branch override price, not the org-master price', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      branchOverrides.getForPricing.mockResolvedValue({ mode: 'override', override_price: 30000 });
      prisma.appointmentPayments.create.mockResolvedValue({ id: 'pay-new', invoice_number: 'INV/1' });

      const result = await service.recordCounterPayment(
        { appointment_id: 'appt-1', tenders: [{ tender_type: 'cash', amount: 300 }] } as any,
        staffUser,
      );

      expect(result).toEqual({ success: true, payment_id: 'pay-new', invoice_number: 'INV/1' });
    });

    it('rejects a counter payment when the branch has skipped this service', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      branchOverrides.getForPricing.mockResolvedValue({ mode: 'skip' });
      await expect(
        service.recordCounterPayment({ appointment_id: 'appt-1', tenders: [{ tender_type: 'cash', amount: 500 }] } as any, staffUser),
      ).rejects.toThrow(/no priced product/i);
      expect(prisma.appointmentPayments.create).not.toHaveBeenCalled();
    });

    it('rejects tenders that sum to less than the amount due (no partial close in this slice)', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      await expect(
        service.recordCounterPayment({ appointment_id: 'appt-1', tenders: [{ tender_type: 'cash', amount: 400 }] } as any, staffUser),
      ).rejects.toThrow(/does not match/i);
      expect(prisma.appointmentPayments.create).not.toHaveBeenCalled();
    });

    it('rejects tenders that sum to more than the amount due', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      await expect(
        service.recordCounterPayment({ appointment_id: 'appt-1', tenders: [{ tender_type: 'cash', amount: 600 }] } as any, staffUser),
      ).rejects.toThrow(/does not match/i);
      expect(prisma.appointmentPayments.create).not.toHaveBeenCalled();
    });

    it('accepts a split across multiple tenders that sums exactly, and creates an audit trail row per tender', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      prisma.appointmentPayments.create.mockResolvedValue({ id: 'pay-new', invoice_number: 'INV/2026-27/CLINIC-A/00001' });

      const result = await service.recordCounterPayment(
        { appointment_id: 'appt-1', tenders: [{ tender_type: 'cash', amount: 300 }, { tender_type: 'upi', amount: 200, reference: 'txn123' }] } as any,
        staffUser,
      );

      expect(result).toEqual({ success: true, payment_id: 'pay-new', invoice_number: 'INV/2026-27/CLINIC-A/00001' });
      expect(prisma.appointmentPayments.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ amount: 50000, status: 'succeeded' }) }),
      );
      expect(prisma.paymentTenders.createMany).toHaveBeenCalledWith({
        data: [
          { appointment_payment_id: 'pay-new', tender_type: 'cash', amount: 30000, reference: undefined, recorded_by_user_id: 'staff-1' },
          { appointment_payment_id: 'pay-new', tender_type: 'upi', amount: 20000, reference: 'txn123', recorded_by_user_id: 'staff-1' },
        ],
      });
    });

    // REQ016 (US-CAT-04) — channel: 'walkin', a counter payment IS the
    // walk-in channel by definition.
    it('resolves the walk-in-channel rate when a channel override exists', async () => {
      prisma.appointments.findUnique.mockResolvedValue({
        ...appointment,
        product: { price: 50000, channel_pricing_json: { online: 45000, walkin: 40000 } },
      });
      prisma.appointmentPayments.create.mockResolvedValue({ id: 'pay-new' });

      await service.recordCounterPayment(
        { appointment_id: 'appt-1', tenders: [{ tender_type: 'cash', amount: 400 }] } as any,
        staffUser,
      );

      expect(prisma.appointmentPayments.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ amount: 40000 }) }),
      );
    });

    // REQ056 (US-BIL-03) — discount at or below the org's threshold.
    describe('discount (below threshold, applied inline)', () => {
      it('rejects a discount with no reason given', async () => {
        prisma.appointments.findUnique.mockResolvedValue(appointment);
        await expect(
          service.recordCounterPayment(
            { appointment_id: 'appt-1', tenders: [{ tender_type: 'cash', amount: 450 }], discount_amount: 50 } as any,
            staffUser,
          ),
        ).rejects.toThrow(/requires a reason/i);
        expect(prisma.appointmentPayments.create).not.toHaveBeenCalled();
      });

      it('rejects a discount larger than the amount due', async () => {
        prisma.appointments.findUnique.mockResolvedValue(appointment);
        await expect(
          service.recordCounterPayment(
            { appointment_id: 'appt-1', tenders: [], discount_amount: 999, discount_reason: 'loyalty' } as any,
            staffUser,
          ),
        ).rejects.toThrow(/cannot exceed the amount due/i);
      });

      it('requires tenders to sum to the amount AFTER the discount, not the full amount due', async () => {
        prisma.appointments.findUnique.mockResolvedValue(appointment);
        await expect(
          service.recordCounterPayment(
            { appointment_id: 'appt-1', tenders: [{ tender_type: 'cash', amount: 500 }], discount_amount: 50, discount_reason: 'loyalty' } as any,
            staffUser,
          ),
        ).rejects.toThrow(/does not match/i);
      });

      it('applies a below-threshold discount inline with no approval, stamping discount fields and a null approver', async () => {
        prisma.appointments.findUnique.mockResolvedValue(appointment);
        prisma.appointmentPayments.create.mockResolvedValue({ id: 'pay-new', invoice_number: 'INV/1' });

        const result = await service.recordCounterPayment(
          { appointment_id: 'appt-1', tenders: [{ tender_type: 'cash', amount: 450 }], discount_amount: 50, discount_reason: 'loyalty' } as any,
          staffUser,
        );

        expect(result).toEqual({ success: true, payment_id: 'pay-new', invoice_number: 'INV/1' });
        expect(prisma.appointmentPayments.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ amount: 45000, discount_amount: 5000, discount_reason: 'loyalty', approved_by_user_id: undefined }),
          }),
        );
        expect(prisma.discountApprovalRequests.create).not.toHaveBeenCalled();
      });
    });

    // The above-threshold "queued for approval" branch is exercised in the
    // dedicated describe block below with a higher-priced fixture — this
    // fixture's ₹500 price is below the default ₹1000 threshold entirely,
    // so a discount large enough to exceed the threshold here would also
    // exceed the amount due, hitting a different guard first.
  });

  // REQ056 (US-BIL-03) — a second appointment fixture with a higher price so
  // an above-threshold discount (>₹1000) still leaves a non-negative amount
  // due, genuinely exercising the queued-for-approval branch rather than the
  // "discount exceeds amount due" guard.
  describe('recordCounterPayment — discount above threshold (real queue path)', () => {
    const staffUser: JwtPayload = { sub: 'staff-1', roles: ['staff'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
    const bigAppointment = {
      id: 'appt-big',
      patient_id: 'patient-1',
      clinic_id: 'clinic-a',
      clinic: { client_org_id: 'org-a' },
      product: { price: 500000 }, // ₹5000.00
      patient: { patient_category: null },
    };

    it('queues a request and returns pending_approval_id, creating no payment', async () => {
      prisma.appointments.findUnique.mockResolvedValue(bigAppointment);
      prisma.discountApprovalRequests.create.mockResolvedValue({ id: 'req-1' });

      const result = await service.recordCounterPayment(
        {
          appointment_id: 'appt-big',
          tenders: [{ tender_type: 'cash', amount: 3500 }],
          discount_amount: 1500,
          discount_reason: 'manager comp',
        } as any,
        staffUser,
      );

      expect(result).toEqual({ success: true, pending_approval_id: 'req-1' });
      expect(prisma.appointmentPayments.create).not.toHaveBeenCalled();
      expect(prisma.discountApprovalRequests.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            appointment_id: 'appt-big',
            clinic_id: 'clinic-a',
            client_org_id: 'org-a',
            requested_by_user_id: 'staff-1',
            discount_amount: 150000,
            discount_reason: 'manager comp',
            expected_amount_paise: 500000,
          }),
        }),
      );
    });

    it('respects a higher org-configured threshold, applying inline what would otherwise queue', async () => {
      prisma.appointments.findUnique.mockResolvedValue({
        ...bigAppointment,
        clinic: { client_org_id: 'org-a', client_organization: { discount_approval_threshold_paise: 500000 } },
      });
      prisma.appointmentPayments.create.mockResolvedValue({ id: 'pay-new' });

      const result = await service.recordCounterPayment(
        {
          appointment_id: 'appt-big',
          tenders: [{ tender_type: 'cash', amount: 3500 }],
          discount_amount: 1500,
          discount_reason: 'manager comp',
        } as any,
        staffUser,
      );

      expect(result).toEqual({ success: true, payment_id: 'pay-new', invoice_number: undefined });
      expect(prisma.discountApprovalRequests.create).not.toHaveBeenCalled();
    });
  });

  // REQ056 (US-BIL-03).
  describe('decideDiscountApproval', () => {
    const managerUser: JwtPayload = { sub: 'mgr-1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
    const pendingRequest = {
      id: 'req-1',
      status: 'pending',
      client_org_id: 'org-a',
      requested_by_user_id: 'staff-1',
      discount_amount: 150000,
      discount_reason: 'manager comp',
      expected_amount_paise: 500000,
      tenders_json: [{ tender_type: 'cash', amountPaise: 350000, reference: null }],
      appointment: {
        id: 'appt-big',
        clinic_id: 'clinic-a',
        patient_id: 'patient-1',
        clinic: { client_org_id: 'org-a' },
      },
    };

    it('rejects a nonexistent request', async () => {
      prisma.discountApprovalRequests.findUnique.mockResolvedValue(null);
      await expect(
        service.decideDiscountApproval({ request_id: 'nope', decision: 'approve' } as any, managerUser),
      ).rejects.toThrow('Discount request not found');
    });

    it('rejects a cross-org request (never confirms cross-tenant existence)', async () => {
      prisma.discountApprovalRequests.findUnique.mockResolvedValue({ ...pendingRequest, client_org_id: 'org-b' });
      await expect(
        service.decideDiscountApproval({ request_id: 'req-1', decision: 'approve' } as any, managerUser),
      ).rejects.toThrow('Discount request not found');
    });

    it('rejects a request that has already been decided', async () => {
      prisma.discountApprovalRequests.findUnique.mockResolvedValue({ ...pendingRequest, status: 'approved' });
      await expect(
        service.decideDiscountApproval({ request_id: 'req-1', decision: 'approve' } as any, managerUser),
      ).rejects.toThrow(/already been decided/i);
    });

    it('rejects the requester approving their own request, even if they hold a manager+ role', async () => {
      prisma.discountApprovalRequests.findUnique.mockResolvedValue(pendingRequest);
      const selfApprover = { ...managerUser, sub: 'staff-1' };
      await expect(
        service.decideDiscountApproval({ request_id: 'req-1', decision: 'approve' } as any, selfApprover),
      ).rejects.toThrow(/cannot approve your own/i);
    });

    it('rejecting a request creates no payment and marks it rejected', async () => {
      prisma.discountApprovalRequests.findUnique.mockResolvedValue(pendingRequest);
      const result = await service.decideDiscountApproval({ request_id: 'req-1', decision: 'reject' } as any, managerUser);
      expect(result).toEqual({ success: true });
      expect(prisma.appointmentPayments.create).not.toHaveBeenCalled();
      expect(prisma.discountApprovalRequests.update).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: { status: 'rejected', approved_by_user_id: 'mgr-1', decided_at: expect.any(Date) },
      });
    });

    it('approving replays the queued tenders, creates the payment, and stamps the approver', async () => {
      prisma.discountApprovalRequests.findUnique.mockResolvedValue(pendingRequest);
      prisma.appointmentPayments.create.mockResolvedValue({ id: 'pay-new', invoice_number: 'INV/1' });

      const result = await service.decideDiscountApproval({ request_id: 'req-1', decision: 'approve' } as any, managerUser);

      expect(result).toEqual({ success: true, payment_id: 'pay-new' });
      expect(prisma.appointmentPayments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: 350000, discount_amount: 150000, approved_by_user_id: 'mgr-1' }),
        }),
      );
      expect(prisma.paymentTenders.createMany).toHaveBeenCalledWith({
        data: [{ appointment_payment_id: 'pay-new', tender_type: 'cash', amount: 350000, reference: undefined, recorded_by_user_id: 'staff-1' }],
      });
      expect(prisma.discountApprovalRequests.update).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: { status: 'approved', approved_by_user_id: 'mgr-1', decided_at: expect.any(Date), resulting_payment_id: 'pay-new' },
      });
    });
  });

  // REQ056 (US-BIL-04, scoped subset).
  describe('closeCashDrawer', () => {
    const staffUser: JwtPayload = { sub: 'staff-1', roles: ['staff'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
    const clinicA = { id: 'clinic-a', client_org_id: 'org-a', is_deleted: false };

    it('rejects a clinic outside the caller\'s org', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-b', client_org_id: 'org-b', is_deleted: false });
      const result = await service.closeCashDrawer(
        { clinic_id: 'clinic-b', business_date: '2026-08-25', counted: [{ tender_type: 'cash', amount: 100 }] } as any,
        staffUser,
      );
      expect(result).toEqual({ success: false, message: 'Clinic not found' });
      expect(prisma.cashDrawerCloseouts.create).not.toHaveBeenCalled();
    });

    it('rejects an invalid business_date', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      const result = await service.closeCashDrawer(
        { clinic_id: 'clinic-a', business_date: 'not-a-date', counted: [{ tender_type: 'cash', amount: 100 }] } as any,
        staffUser,
      );
      expect(result.success).toBe(false);
    });

    it('computes expected totals server-side from real succeeded tenders, and reports variance against the counted totals', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.paymentTenders.findMany.mockResolvedValue([
        { tender_type: 'cash', amount: 30000 },
        { tender_type: 'cash', amount: 20000 },
        { tender_type: 'upi', amount: 15000 },
      ]);
      prisma.cashDrawerCloseouts.create.mockResolvedValue({
        id: 'close-1', clinic_id: 'clinic-a', closed_by_user_id: 'staff-1', business_date: new Date('2026-08-25T00:00:00.000Z'),
        total_expected_paise: 65000, total_counted_paise: 60000, variance_paise: -5000, notes: null, created_at: new Date(),
      });

      const result = await service.closeCashDrawer(
        {
          clinic_id: 'clinic-a',
          business_date: '2026-08-25',
          counted: [{ tender_type: 'cash', amount: 450 }, { tender_type: 'upi', amount: 150 }],
        } as any,
        staffUser,
      );

      expect(result.success).toBe(true);
      expect(prisma.cashDrawerCloseouts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clinic_id: 'clinic-a',
            total_expected_paise: 65000,
            total_counted_paise: 60000,
            variance_paise: -5000,
            breakdown_json: { cash: { expected_paise: 50000, counted_paise: 45000 }, upi: { expected_paise: 15000, counted_paise: 15000 } },
          }),
        }),
      );
      expect(result.closeout?.variance).toBe(-50);
    });

    it('rejects a second close attempt for an already-closed clinic/date (unique constraint)', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.paymentTenders.findMany.mockResolvedValue([]);
      const conflict: any = new Error('Unique constraint failed');
      conflict.code = 'P2002';
      prisma.cashDrawerCloseouts.create.mockRejectedValue(conflict);

      const result = await service.closeCashDrawer(
        { clinic_id: 'clinic-a', business_date: '2026-08-25', counted: [{ tender_type: 'cash', amount: 100 }] } as any,
        staffUser,
      );

      expect(result).toEqual({ success: false, message: "This clinic's drawer has already been closed for this date" });
    });
  });

  // REQ056 (US-BIL-03/US-BIL-04) — list-query org scoping.
  describe('discountApprovalRequests / cashDrawerCloseouts (list queries)', () => {
    const managerUser: JwtPayload = { sub: 'mgr-1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;

    it('discountApprovalRequests scopes to the caller\'s own org', async () => {
      prisma.discountApprovalRequests.findMany.mockResolvedValue([]);
      await service.discountApprovalRequests(undefined, managerUser);
      expect(prisma.discountApprovalRequests.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
    });

    it('cashDrawerCloseouts scopes to the caller\'s own org and reconstructs the breakdown from stored JSON', async () => {
      prisma.cashDrawerCloseouts.findMany.mockResolvedValue([
        {
          id: 'close-1', clinic_id: 'clinic-a', closed_by_user_id: 'staff-1', business_date: new Date('2026-08-25T00:00:00.000Z'),
          breakdown_json: { cash: { expected_paise: 50000, counted_paise: 45000 } },
          total_expected_paise: 50000, total_counted_paise: 45000, variance_paise: -5000, notes: null, created_at: new Date(),
        },
      ]);
      const result = await service.cashDrawerCloseouts(undefined, managerUser);
      expect(prisma.cashDrawerCloseouts.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
      expect(result[0].breakdown).toEqual([{ tender_type: 'cash', expected: 500, counted: 450, variance: -50 }]);
      expect(result[0].total_expected).toBe(500);
      expect(result[0].variance).toBe(-50);
    });
  });

  // REQ054 (US-CAT-01)
  describe('redeemPackageSitting', () => {
    const staffUser: JwtPayload = { sub: 'staff-1', roles: ['staff'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
    const appointment = {
      id: 'appt-1', patient_id: 'patient-1', clinic_id: 'clinic-a', clinic: { client_org_id: 'org-a' },
    };
    const patientPackage = {
      id: 'pp-1', patient_id: 'patient-1', client_org_id: 'org-a',
      sittings_remaining: 3, expires_at: new Date(Date.now() + 86400000), is_deleted: false,
    };

    it('rejects a nonexistent appointment', async () => {
      prisma.appointments.findUnique.mockResolvedValue(null);
      await expect(
        service.redeemPackageSitting({ appointment_id: 'nope', patient_package_id: 'pp-1' }, staffUser),
      ).rejects.toThrow('Appointment not found');
    });

    it('rejects a cross-org appointment', async () => {
      prisma.appointments.findUnique.mockResolvedValue({ ...appointment, clinic: { client_org_id: 'org-b' } });
      await expect(
        service.redeemPackageSitting({ appointment_id: 'appt-1', patient_package_id: 'pp-1' }, staffUser),
      ).rejects.toThrow('Appointment not found');
    });

    it('rejects a nonexistent package', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      prisma.patientPackages.findUnique.mockResolvedValue(null);
      await expect(
        service.redeemPackageSitting({ appointment_id: 'appt-1', patient_package_id: 'ghost' }, staffUser),
      ).rejects.toThrow('Package not found');
    });

    it('rejects a cross-org package', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      prisma.patientPackages.findUnique.mockResolvedValue({ ...patientPackage, client_org_id: 'org-b' });
      await expect(
        service.redeemPackageSitting({ appointment_id: 'appt-1', patient_package_id: 'pp-1' }, staffUser),
      ).rejects.toThrow('Package not found');
    });

    it('rejects a package belonging to a different patient than the appointment', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      prisma.patientPackages.findUnique.mockResolvedValue({ ...patientPackage, patient_id: 'someone-else' });
      await expect(
        service.redeemPackageSitting({ appointment_id: 'appt-1', patient_package_id: 'pp-1' }, staffUser),
      ).rejects.toThrow(/does not belong to this appointment/i);
    });

    it('rejects an expired package', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      prisma.patientPackages.findUnique.mockResolvedValue({ ...patientPackage, expires_at: new Date(Date.now() - 1000) });
      await expect(
        service.redeemPackageSitting({ appointment_id: 'appt-1', patient_package_id: 'pp-1' }, staffUser),
      ).rejects.toThrow(/expired/i);
    });

    it('rejects a package with no sittings remaining', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      prisma.patientPackages.findUnique.mockResolvedValue({ ...patientPackage, sittings_remaining: 0 });
      await expect(
        service.redeemPackageSitting({ appointment_id: 'appt-1', patient_package_id: 'pp-1' }, staffUser),
      ).rejects.toThrow(/no sittings remaining/i);
      expect(prisma.appointmentPayments.create).not.toHaveBeenCalled();
    });

    it('decrements sittings_remaining and records a zero-amount succeeded payment', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      prisma.patientPackages.findUnique
        .mockResolvedValueOnce(patientPackage) // pre-check
        .mockResolvedValueOnce(patientPackage) // fresh re-check inside the transaction
        .mockResolvedValueOnce({ ...patientPackage, sittings_remaining: 2 }); // post-decrement read
      prisma.appointmentPayments.create.mockResolvedValue({ id: 'pay-redeem' });

      const result = await service.redeemPackageSitting({ appointment_id: 'appt-1', patient_package_id: 'pp-1' }, staffUser);

      expect(prisma.patientPackages.update).toHaveBeenCalledWith({
        where: { id: 'pp-1' },
        data: { sittings_remaining: { decrement: 1 } },
      });
      expect(prisma.appointmentPayments.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          amount: 0,
          status: 'succeeded',
          metadata: { package_redemption: true, patient_package_id: 'pp-1' },
        }),
      }));
      expect(result).toEqual({ success: true, payment_id: 'pay-redeem', sittings_remaining: 2 });
    });
  });
});
