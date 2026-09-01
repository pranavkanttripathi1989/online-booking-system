import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsResolver } from './organizations.resolver';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [EntitlementsModule],
  providers: [OrganizationsService, OrganizationsResolver],
  // REQ178 — PlatformBillingModule reuses assignPlan()/organizationsService
  // directly (never re-derives the entitlement-linkage write), so it needs
  // this exported now.
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
