import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhookDispatchService } from './webhook-dispatch.service';
import { WebhooksResolver } from './webhooks.resolver';

@Module({
  providers: [WebhooksService, WebhookDispatchService, WebhooksResolver],
  exports: [WebhooksService, WebhookDispatchService],
})
export class WebhooksModule {}
