import { Module } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';
import { EntitlementGuard } from './entitlement.guard';
import { EntitlementsResolver } from './entitlements.resolver';

@Module({
  providers: [EntitlementsService, EntitlementGuard, EntitlementsResolver],
  exports: [EntitlementsService, EntitlementGuard],
})
export class EntitlementsModule {}
