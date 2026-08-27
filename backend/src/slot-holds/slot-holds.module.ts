import { Module } from '@nestjs/common';
import { SlotHoldsService } from './slot-holds.service';

// RedisModule is @Global(), so REDIS_CLIENT needs no explicit import here.
// No resolver of its own — hold/release mutations live on AppointmentsResolver
// and PublicResolver, each in their own dialect, matching P1-05's PLAN.
@Module({
  providers: [SlotHoldsService],
  exports: [SlotHoldsService],
})
export class SlotHoldsModule {}
