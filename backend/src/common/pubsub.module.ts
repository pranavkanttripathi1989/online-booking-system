import { Global, Module } from '@nestjs/common';
import { PubSubProvider } from './pubsub.provider';

// @Global() so any module (AppointmentsModule, a future MessagesModule) can
// inject PUB_SUB without importing this module explicitly — same pattern
// RedisModule already uses for the same reason.
@Global()
@Module({
  providers: [PubSubProvider],
  exports: [PubSubProvider],
})
export class PubSubModule {}
