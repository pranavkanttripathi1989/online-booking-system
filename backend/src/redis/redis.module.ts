import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379'),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // F-29. This module previously created an ioredis client and never closed it.
  // ioredis holds an open socket plus reconnection timers for the lifetime of
  // the process, so nothing here ever became eligible for garbage collection
  // and the Node event loop never drained.
  //
  // Two consequences, and the test one is the less important of the two:
  //
  //  - Jest reported "A worker process has failed to exit gracefully" and the
  //    integration suite could only finish under --forceExit. A hanging worker
  //    hangs CI, which is why this blocked F-26.
  //  - In production, a SIGTERM left the Redis connection dangling instead of
  //    closing it, so `app.close()` never resolved and the container relied on
  //    the orchestrator's kill timeout to die. PrismaService has always had the
  //    equivalent hook (prisma.service.ts onModuleDestroy); Redis simply never
  //    got one.
  //
  // `onApplicationShutdown` rather than `onModuleDestroy`: this is a @Global()
  // module that other modules' shutdown paths may still want to talk to, and
  // application-shutdown hooks run after every module has been destroyed.
  //
  // `quit()` drains in-flight commands before closing, unlike `disconnect()`,
  // which drops them. Wrapped because quit() rejects if the connection is
  // already gone (a Redis that died first, or a second shutdown) and a throw
  // here would mask the real reason the app is shutting down.
  async onApplicationShutdown(): Promise<void> {
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}
