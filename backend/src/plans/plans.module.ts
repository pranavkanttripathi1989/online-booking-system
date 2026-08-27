import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansResolver } from './plans.resolver';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [EntitlementsModule],
  providers: [PlansService, PlansResolver],
  exports: [PlansService],
})
export class PlansModule {}
