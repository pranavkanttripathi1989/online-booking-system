import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AvailabilityResolver } from './availability.resolver';
import { DateScalar } from '../common/scalars/date.scalar';

@Module({
  providers: [AvailabilityService, AvailabilityResolver, DateScalar],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
