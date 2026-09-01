import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AdmissionsService } from './admissions.service';
import { MlcService } from './mlc.service';
import { AdmissionsResolver } from './admissions.resolver';
import { MlcPoliceIntimationSweepService } from './mlc-police-intimation-sweep.service';
import { BedStatusReconcileService } from './bed-status-reconcile.service';
import { WardsModule } from '../wards/wards.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';

// REQ179 (IPD slice 1). ScheduleModule.forRoot() is idempotent and each
// sweep-owning module registers its own (the pharmacy.module.ts convention).
// NotificationsModule is @Global(), so it is not imported here.
@Module({
  imports: [ScheduleModule.forRoot(), WardsModule, EntitlementsModule],
  providers: [
    AdmissionsService,
    MlcService,
    AdmissionsResolver,
    MlcPoliceIntimationSweepService,
    BedStatusReconcileService,
  ],
  exports: [AdmissionsService, MlcService],
})
export class AdmissionsModule {}
