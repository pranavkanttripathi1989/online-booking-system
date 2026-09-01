import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PlatformBillingService } from './platform-billing.service';
import { PlatformBillingResolver } from './platform-billing.resolver';
import { PlatformBillingWebhooksController } from './platform-billing-webhooks.controller';
import { PlatformBillingDunningSweepService } from './platform-billing-dunning-sweep.service';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  // ScheduleModule.forRoot() is idempotent (Nest de-dupes it) — every
  // sweep-owning module already calls it directly, matching
  // pharmacy.module.ts/consent.module.ts's own established convention.
  // NotificationsModule is @Global(), not imported here.
  imports: [ScheduleModule.forRoot(), OrganizationsModule],
  providers: [PlatformBillingService, PlatformBillingResolver, PlatformBillingDunningSweepService],
  controllers: [PlatformBillingWebhooksController],
  exports: [PlatformBillingService],
})
export class PlatformBillingModule {}
