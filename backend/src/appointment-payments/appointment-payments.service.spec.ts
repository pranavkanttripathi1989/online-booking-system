import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import { AppointmentPaymentsService } from './appointment-payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

const ORIGINAL_ENV = process.env;

describe('AppointmentPaymentsService', () => {
  let service: AppointmentPaymentsService;
  let prisma: {
    appointments: { findUnique: jest.Mock };
    appointmentPayments: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock; findMany: jest.Mock };
  };
  let fetchMock: jest.Mock;

  const orgUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u2', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV, RAZORPAY_KEY_ID: 'rzp_test_fake', RAZORPAY_KEY_SECRET: 'fake_secret' };
    prisma = {
      appointments: { findUnique: jest.fn() },
      appointmentPayments: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    };
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppointmentPaymentsService, { provide: PrismaService, useValue: prisma }],
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
    const pendingPayment = { id: 'pay-1', razorpay_order_id: 'order_1', status: 'pending' };

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
});
