import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IpdBillingService } from './ipd-billing.service';
import { RoomDayAccrualService } from './room-day-accrual.service';
import { IpdBillingResolver } from './ipd-billing.resolver';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { BranchOverridesModule } from '../branch-overrides/branch-overrides.module';

// REQ179 (IPD slice 4). EntitlementsModule for EntitlementGuard's own
// dependency, applied per-handler in the resolver (the wards.module.ts /
// admissions.module.ts / nursing.module.ts / operation-theatre.module.ts
// precedent). ScheduleModule.forRoot() is idempotent and each sweep-owning
// module registers its own (the same precedent). BranchOverridesModule for
// IpdBillingService's own pricing dependency.
@Module({
  imports: [ScheduleModule.forRoot(), EntitlementsModule, BranchOverridesModule],
  providers: [IpdBillingService, RoomDayAccrualService, IpdBillingResolver],
  exports: [IpdBillingService, RoomDayAccrualService],
})
export class IpdBillingModule {}
