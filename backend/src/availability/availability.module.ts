import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AvailabilityResolver } from './availability.resolver';

@Module({
  providers: [AvailabilityService, AvailabilityResolver],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
