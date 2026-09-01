import { Module } from '@nestjs/common';
import { WardsService } from './wards.service';
import { BedBoardService } from './bed-board.service';
import { WardsResolver } from './wards.resolver';
import { EntitlementsModule } from '../entitlements/entitlements.module';

// REQ179 (IPD slice 1). EntitlementsModule is imported for EntitlementGuard's
// own dependency; the guard itself is applied per-handler in the resolver, not
// registered globally.
@Module({
  imports: [EntitlementsModule],
  providers: [WardsService, BedBoardService, WardsResolver],
  // AdmissionsModule consumes WardsService.assertWardInScope() when validating
  // a caller-supplied bed at admission time.
  exports: [WardsService, BedBoardService],
})
export class WardsModule {}
