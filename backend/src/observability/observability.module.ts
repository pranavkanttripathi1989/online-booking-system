import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { WebVitalsController } from './web-vitals.controller';

@Module({
  controllers: [HealthController, WebVitalsController],
})
export class ObservabilityModule {}
