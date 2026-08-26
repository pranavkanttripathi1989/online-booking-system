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
  // REQ109 — prescriptions.service.ts needs direct provider-config access
  // (WhatsApp + SMS separately, its own two-channel design) rather than
  // going through NotificationTriggerService's own single-recipient
  // dispatch() shape, which assumes a UserProfiles row (a shared
  // prescription's recipient frequently has none).
  exports: [NotificationsService, NotificationTriggerService, NotificationProviderConfigService],
})
export class NotificationsModule {}
