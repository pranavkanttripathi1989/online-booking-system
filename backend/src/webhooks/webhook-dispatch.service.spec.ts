import { Test, TestingModule } from '@nestjs/testing';
import { WebhookDispatchService } from './webhook-dispatch.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('../common/crypto/secrets', () => ({ decrypt: jest.fn((s: string) => s.replace('encrypted(', '').replace(')', '')) }));

const originalFetch = global.fetch;

// REQ030 (US-INT-02, scoped down) — best-effort delivery: fireEvent is a
// no-op when no endpoint subscribes to the event, a failed HTTP call is
// caught and logged (never thrown back at the caller — a webhook delivery
// failure must never break the appointment/payment flow that triggered it).
describe('WebhookDispatchService', () => {
  let service: WebhookDispatchService;
  let prisma: {
    webhookEndpoints: { findMany: jest.Mock };
    webhookDeliveryLog: { create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      webhookEndpoints: { findMany: jest.fn() },
      webhookDeliveryLog: { create: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhookDispatchService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(WebhookDispatchService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('is a no-op when the org has no active endpoint at all', async () => {
    prisma.webhookEndpoints.findMany.mockResolvedValue([]);
    await service.fireEvent('org-a', 'appointment.created', { id: '1' });
    expect(prisma.webhookDeliveryLog.create).not.toHaveBeenCalled();
  });

  it('is a no-op when no endpoint is subscribed to this specific event type', async () => {
    prisma.webhookEndpoints.findMany.mockResolvedValue([
      { id: 'ep1', url: 'https://a.test', secret: 'encrypted(s)', event_types_json: ['payment.succeeded'] },
    ]);
    await service.fireEvent('org-a', 'appointment.created', { id: '1' });
    expect(prisma.webhookDeliveryLog.create).not.toHaveBeenCalled();
  });

  it('POSTs a signed payload and logs a succeeded delivery on a 2xx response', async () => {
    prisma.webhookEndpoints.findMany.mockResolvedValue([
      { id: 'ep1', url: 'https://a.test', secret: 'encrypted(shared-secret)', event_types_json: ['appointment.created'] },
    ]);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('ok') }) as any;
    await service.fireEvent('org-a', 'appointment.created', { id: '1' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://a.test',
      expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'X-MediBook-Signature': expect.any(String) }) }),
    );
    expect(prisma.webhookDeliveryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'succeeded', http_status: 200 }) }),
    );
  });

  it('logs a failed delivery, without throwing, when the endpoint is unreachable', async () => {
    prisma.webhookEndpoints.findMany.mockResolvedValue([
      { id: 'ep1', url: 'https://a.test', secret: 'encrypted(s)', event_types_json: ['appointment.created'] },
    ]);
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as any;
    await expect(service.fireEvent('org-a', 'appointment.created', { id: '1' })).resolves.not.toThrow();
    expect(prisma.webhookDeliveryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }),
    );
  });

  // REQ112 — retry scheduling.
  describe('retry scheduling', () => {
    const endpoint = { id: 'ep1', url: 'https://a.test', secret: 'encrypted(s)' };

    it('a failed delivery (non-2xx) writes attempt_number 1 and schedules next_retry_at ~1 minute out', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('err') }) as any;
      await service.retryOne(endpoint, 'appointment.created', { id: '1' }, 1);
      const call = prisma.webhookDeliveryLog.create.mock.calls[0][0].data;
      expect(call.status).toBe('failed');
      expect(call.attempt_number).toBe(1);
      const deltaMs = call.next_retry_at.getTime() - Date.now();
      expect(deltaMs).toBeGreaterThan(50_000);
      expect(deltaMs).toBeLessThan(70_000);
    });

    it('a retry at attempt 6 that still fails writes status exhausted with no further retry', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('err') }) as any;
      await service.retryOne(endpoint, 'appointment.created', { id: '1' }, 6);
      const call = prisma.webhookDeliveryLog.create.mock.calls[0][0].data;
      expect(call.status).toBe('exhausted');
      expect(call.next_retry_at).toBeNull();
    });

    it('a retry that succeeds writes status succeeded with no next_retry_at', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('ok') }) as any;
      await service.retryOne(endpoint, 'appointment.created', { id: '1' }, 2);
      const call = prisma.webhookDeliveryLog.create.mock.calls[0][0].data;
      expect(call.status).toBe('succeeded');
      expect(call.attempt_number).toBe(2);
      expect(call.next_retry_at).toBeUndefined();
    });

    it('a decrypt failure returns early without writing any delivery log row', async () => {
      const { decrypt } = jest.requireMock('../common/crypto/secrets');
      decrypt.mockImplementationOnce(() => { throw new Error('bad ciphertext'); });
      await service.retryOne(endpoint, 'appointment.created', { id: '1' }, 1);
      expect(prisma.webhookDeliveryLog.create).not.toHaveBeenCalled();
    });
  });
});
