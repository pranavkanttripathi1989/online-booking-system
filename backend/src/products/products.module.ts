import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ProductsService } from './products.service';
import { ProductsResolver } from './products.resolver';
import { PriceHistorySweepService } from './price-history-sweep.service';

@Module({
  // ScheduleModule.forRoot() is idempotent -- appointments.module.ts and
  // others already register it; NestJS deduplicates by module identity.
  imports: [ScheduleModule.forRoot()],
  providers: [ProductsService, ProductsResolver, PriceHistorySweepService],
  exports: [ProductsService],
})
export class ProductsModule {}
