import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';

describe('HealthController (P1-18)', () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };
  let redis: { ping: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };
    redis = { ping: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('reports ok when both Postgres and Redis respond', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    redis.ping.mockResolvedValue('PONG');

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.checks.postgres.ok).toBe(true);
    expect(result.checks.redis.ok).toBe(true);
    expect(typeof result.checks.postgres.latency_ms).toBe('number');
    expect(typeof result.checks.redis.latency_ms).toBe('number');
  });

  it('throws a 503 with a degraded body when Postgres is down', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));
    redis.ping.mockResolvedValue('PONG');

    await expect(controller.check()).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({
        status: 'degraded',
        checks: expect.objectContaining({ postgres: { ok: false }, redis: { ok: true, latency_ms: expect.any(Number) } }),
      }),
    });
  });

  it('throws a 503 with a degraded body when Redis is down', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    redis.ping.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(controller.check()).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({ status: 'degraded' }),
    });
  });

  it('never leaks the raw error message into the response body', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('password authentication failed for user "medibook"'));
    redis.ping.mockResolvedValue('PONG');

    try {
      await controller.check();
      fail('expected controller.check() to throw');
    } catch (err) {
      const body = JSON.stringify(err.response);
      expect(body).not.toMatch(/password authentication failed/);
    }
  });
});
