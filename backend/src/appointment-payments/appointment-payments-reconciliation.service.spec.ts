import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentPaymentsReconciliationService } from './appointment-payments-reconciliation.service';
import { PrismaService } from '../prisma/prisma.service';

const ORIGINAL_ENV = process.env;

describe('AppointmentPaymentsReconciliationService (REQ040)', () => {
  let service: AppointmentPaymentsReconciliationService;
  let prisma: {
    appointmentPayments: { findMany: jest.Mock; update: jest.Mock };
    auditLogs: { create: jest.Mock };
  };
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV, RAZORPAY_KEY_ID: 'rzp_test_fake', RAZORPAY_KEY_SECRET: 'fake_secret' };
    prisma = {
      appointmentPayments: { findMany: jest.fn(), update: jest.fn() },
      auditLogs: { create: jest.fn() },
    };
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppointmentPaymentsReconciliationService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(AppointmentPaymentsReconciliationService);
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('does nothing when there are no stale pending payments', async () => {
    prisma.appointmentPayments.findMany.mockResolvedValue([]);
    await service.reconcilePendingPayments();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips the sweep entirely if Razorpay credentials are not configured, rather than failing loudly on every row', async () => {
    delete process.env.RAZORPAY_KEY_ID;
    prisma.appointmentPayments.findMany.mockResolvedValue([{ id: 'p1', razorpay_order_id: 'order_1' }]);
    await service.reconcilePendingPayments();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prisma.appointmentPayments.update).not.toHaveBeenCalled();
  });

  it('marks a stale pending payment succeeded when Razorpay reports a captured payment for it', async () => {
    prisma.appointmentPayments.findMany.mockResolvedValue([{ id: 'p1', razorpay_order_id: 'order_1' }]);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [{ id: 'pay_x', status: 'captured' }] }),
    });
    await service.reconcilePendingPayments();
    expect(prisma.appointmentPayments.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { status: 'succeeded', razorpay_payment_id: 'pay_x' },
    });
    expect(prisma.auditLogs.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ outcome: 'reconciled_succeeded' }) }));
  });

  it('marks a stale pending payment failed when Razorpay reports no captured payment for it', async () => {
    prisma.appointmentPayments.findMany.mockResolvedValue([{ id: 'p1', razorpay_order_id: 'order_1' }]);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });
    await service.reconcilePendingPayments();
    expect(prisma.appointmentPayments.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { status: 'failed' } });
    expect(prisma.auditLogs.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ outcome: 'reconciled_failed' }) }));
  });

  it('logs an error outcome and leaves the row untouched when the Razorpay API call itself fails, rather than marking it failed on an inconclusive check', async () => {
    prisma.appointmentPayments.findMany.mockResolvedValue([{ id: 'p1', razorpay_order_id: 'order_1' }]);
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: { description: 'rate limited' } }) });
    await service.reconcilePendingPayments();
    expect(prisma.appointmentPayments.update).not.toHaveBeenCalled();
    expect(prisma.auditLogs.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ outcome: 'error' }) }));
  });

  it('reconciles multiple stale rows independently -- one failing fetch does not block the others', async () => {
    prisma.appointmentPayments.findMany.mockResolvedValue([
      { id: 'p1', razorpay_order_id: 'order_1' },
      { id: 'p2', razorpay_order_id: 'order_2' },
    ]);
    fetchMock
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ id: 'pay_y', status: 'captured' }] }) });
    await service.reconcilePendingPayments();
    expect(prisma.auditLogs.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ resource_id: 'p1', outcome: 'error' }) }));
    expect(prisma.appointmentPayments.update).toHaveBeenCalledWith({
      where: { id: 'p2' },
      data: { status: 'succeeded', razorpay_payment_id: 'pay_y' },
    });
  });
});
