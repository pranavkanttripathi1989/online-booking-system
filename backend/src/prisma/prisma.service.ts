import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { clampTakeMiddleware } from './clamp-take.middleware';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();

    // $use (middleware), not $extends -- $extends returns a new client
    // instance rather than mutating one in place, which doesn't compose
    // with `class PrismaService extends PrismaClient`'s single shared
    // instance (injected everywhere via Nest's DI). $use is deprecated in
    // favor of extensions as of Prisma 5 but still fully supported, and is
    // the only one of the two that can attach to `this` here.
    this.$use(clampTakeMiddleware());
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
