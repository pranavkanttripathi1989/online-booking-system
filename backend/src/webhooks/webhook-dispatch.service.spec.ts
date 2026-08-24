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
});
