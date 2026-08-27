import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PharmacyService } from './pharmacy.service';
import { PharmacyResolver } from './pharmacy.resolver';
import { LowStockSweepService } from './low-stock-sweep.service';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  // ScheduleModule.forRoot() is idempotent -- see products.module.ts's own
  // identical comment.
  imports: [ScheduleModule.forRoot(), EntitlementsModule],
  providers: [PharmacyService, PharmacyResolver, LowStockSweepService],
  exports: [PharmacyService],
})
export class PharmacyModule {}
