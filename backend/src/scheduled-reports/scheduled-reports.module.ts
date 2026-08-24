import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduledReportsService } from './scheduled-reports.service';
import { ScheduledReportsResolver } from './scheduled-reports.resolver';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  // Idempotent to import more than once (already imported by
  // appointment-payments.module.ts) — Nest's own documented behaviour.
  imports: [ScheduleModule.forRoot(), AnalyticsModule],
  providers: [ScheduledReportsService, ScheduledReportsResolver],
  exports: [ScheduledReportsService],
})
export class ScheduledReportsModule {}
