import { Module } from '@nestjs/common';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationPreferencesResolver } from './notification-preferences.resolver';

@Module({
  providers: [NotificationPreferencesService, NotificationPreferencesResolver],
})
export class NotificationPreferencesModule {}
