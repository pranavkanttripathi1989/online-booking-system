import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsResolver } from './notifications.resolver';
import { NotificationProviderConfigService } from './notification-provider-config.service';
import { NotificationProviderConfigResolver } from './notification-provider-config.resolver';
import { NotificationTriggerService } from './notification-trigger.service';

// @Global() so AppointmentsModule/MessagesModule/AppointmentPaymentsModule
// can inject NotificationTriggerService without each declaring an explicit
// import — matches the same established pattern PubSubModule already uses
// (common/pubsub.module.ts) for the same "many unrelated domains need this
// one shared service" shape.
@Global()
@Module({
  providers: [
    NotificationsService,
    NotificationsResolver,
    NotificationProviderConfigService,
    NotificationProviderConfigResolver,
    NotificationTriggerService,
  ],
  exports: [NotificationsService, NotificationTriggerService],
})
export class NotificationsModule {}
