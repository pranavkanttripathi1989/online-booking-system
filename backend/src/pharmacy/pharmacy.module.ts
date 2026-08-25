import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PharmacyService } from './pharmacy.service';
import { PharmacyResolver } from './pharmacy.resolver';
import { LowStockSweepService } from './low-stock-sweep.service';

@Module({
  // ScheduleModule.forRoot() is idempotent -- see products.module.ts's own
  // identical comment.
  imports: [ScheduleModule.forRoot()],
  providers: [PharmacyService, PharmacyResolver, LowStockSweepService],
  exports: [PharmacyService],
})
export class PharmacyModule {}
