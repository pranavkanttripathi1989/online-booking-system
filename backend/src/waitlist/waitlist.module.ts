import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WaitlistService } from './waitlist.service';
import { WaitlistResolver } from './waitlist.resolver';
import { WaitlistExpirySweepService } from './waitlist-expiry-sweep.service';

@Module({
  // ScheduleModule.forRoot() is idempotent -- see products.module.ts's own
  // identical comment.
  imports: [ScheduleModule.forRoot()],
  providers: [WaitlistService, WaitlistResolver, WaitlistExpirySweepService],
  exports: [WaitlistService],
})
export class WaitlistModule {}
