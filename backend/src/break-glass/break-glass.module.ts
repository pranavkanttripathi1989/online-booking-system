import { Module } from '@nestjs/common';
import { BreakGlassService } from './break-glass.service';
import { BreakGlassResolver } from './break-glass.resolver';

// NotificationTriggerService comes from the @Global() NotificationsModule —
// no explicit import needed, same as every other domain that injects it.
@Module({
  providers: [BreakGlassService, BreakGlassResolver],
  exports: [BreakGlassService],
})
export class BreakGlassModule {}
