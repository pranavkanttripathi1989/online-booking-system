import { Controller, Get, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import type Redis from 'ioredis';

// P1-18 — real uptime evidence ("was it down, answerable with data"), not
// a hand-waved status page. Hand-rolled rather than @nestjs/terminus:
// two checks (Postgres, Redis) don't justify a dependency whose own peer
// surface (mongoose/typeorm/grpc/mikro-orm) is entirely unused here —
// matches this codebase's own "don't add an abstraction beyond what's
// needed" discipline. @Public() -- a health check that requires auth to
// tell you the app is unauthenticated-broken defeats its own purpose,
// and it must never leak anything sensitive (see the response shape
// below: booleans and latency numbers only, never a raw driver error).
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Public()
  @Get()
  async check() {
    const [postgres, redis] = await Promise.all([this.checkPostgres(), this.checkRedis()]);
    const healthy = postgres.ok && redis.ok;
    const body = {
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: { postgres, redis },
    };
    // A degraded body is still useful diagnostic information -- a 503
    // with no body would force whatever's polling this to guess which
    // dependency failed.
    if (!healthy) throw new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
    return body;
  }

  private async checkPostgres(): Promise<{ ok: boolean; latency_ms?: number }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, latency_ms: Date.now() - start };
    } catch {
      // Never surface the raw driver error (connection strings, internal
      // hostnames) in a @Public() response -- a boolean is all a health
      // check should ever reveal about *why*.
      return { ok: false };
    }
  }

  private async checkRedis(): Promise<{ ok: boolean; latency_ms?: number }> {
    const start = Date.now();
    try {
      await this.redis.ping();
      return { ok: true, latency_ms: Date.now() - start };
    } catch {
      return { ok: false };
    }
  }
}
