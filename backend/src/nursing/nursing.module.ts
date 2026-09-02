import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NursingService } from './nursing.service';
import { MedicationOrdersService } from './medication-orders.service';
import { MarService } from './mar.service';
import { MarScheduleSweepService } from './mar-schedule-sweep.service';
import { NursingResolver } from './nursing.resolver';
import { EntitlementsModule } from '../entitlements/entitlements.module';

// REQ179 (IPD slice 2). EntitlementsModule for EntitlementGuard's own
// dependency, applied per-handler in the resolver (the wards.module.ts /
// admissions.module.ts precedent), not registered globally. ScheduleModule
// .forRoot() is idempotent and each sweep-owning module registers its own
// (the admissions.module.ts / pharmacy.module.ts convention).
@Module({
  imports: [ScheduleModule.forRoot(), EntitlementsModule],
  providers: [NursingService, MedicationOrdersService, MarService, MarScheduleSweepService, NursingResolver],
  exports: [NursingService, MedicationOrdersService, MarService],
})
export class NursingModule {}
