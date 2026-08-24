import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsResolver } from './analytics.resolver';

@Module({
  providers: [AnalyticsService, AnalyticsResolver],
  // REQ029 (US-RPT-03) — ScheduledReportsModule reuses the real
  // AnalyticsService methods to compute each report's snapshot.
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
