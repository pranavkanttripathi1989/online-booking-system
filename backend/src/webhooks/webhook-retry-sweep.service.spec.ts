import { Test, TestingModule } from '@nestjs/testing';
import { WebhookRetrySweepService } from './webhook-retry-sweep.service';
import { WebhookDispatchService } from './webhook-dispatch.service';
import { PrismaService } from '../prisma/prisma.service';

// REQ112
describe('WebhookRetrySweepService', () => {
  let service: WebhookRetrySweepService;
  let prisma: { webhookDeliveryLog: { findMany: jest.Mock } };
  let dispatch: { retryOne: jest.Mock };

  beforeEach(async () => {
    prisma = { webhookDeliveryLog: { findMany: jest.fn().mockResolvedValue([]) } };
    dispatch = { retryOne: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookRetrySweepService,
        { provide: PrismaService, useValue: prisma },
        { provide: WebhookDispatchService, useValue: dispatch },
      ],
    }).compile();
    service = module.get(WebhookRetrySweepService);
  });

  it('queries only status:failed rows with a due next_retry_at', async () => {
    await service.sweepDueRetries();
    expect(prisma.webhookDeliveryLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'failed', next_retry_at: { lte: expect.any(Date) } },
      }),
    );
  });

  it('skips a row whose endpoint has since been deactivated', async () => {
    prisma.webhookDeliveryLog.findMany.mockResolvedValue([
      { attempt_number: 1, event_type: 'appointment.created', payload_json: {}, endpoint: { id: 'ep1', is_active: false } },
    ]);
    await service.sweepDueRetries();
    expect(dispatch.retryOne).not.toHaveBeenCalled();
  });

  it('calls dispatch.retryOne with attempt_number + 1, not a hardcoded value', async () => {
    const endpoint = { id: 'ep1', is_active: true, url: 'https://a.test', secret: 'enc' };
    prisma.webhookDeliveryLog.findMany.mockResolvedValue([
      { attempt_number: 3, event_type: 'appointment.created', payload_json: { id: '1' }, endpoint },
    ]);
    await service.sweepDueRetries();
    expect(dispatch.retryOne).toHaveBeenCalledWith(endpoint, 'appointment.created', { id: '1' }, 4);
  });
});
