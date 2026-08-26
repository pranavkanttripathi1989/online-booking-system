import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WebhooksService } from './webhooks.service';
import { WebhookDispatchService } from './webhook-dispatch.service';
import { WebhookRetrySweepService } from './webhook-retry-sweep.service';
import { WebhooksResolver } from './webhooks.resolver';

@Module({
  // ScheduleModule.forRoot() is idempotent — see products.module.ts's own
  // precedent for registering it locally alongside other @Cron-using modules.
  imports: [ScheduleModule.forRoot()],
  providers: [WebhooksService, WebhookDispatchService, WebhookRetrySweepService, WebhooksResolver],
  exports: [WebhooksService, WebhookDispatchService],
})
export class WebhooksModule {}
