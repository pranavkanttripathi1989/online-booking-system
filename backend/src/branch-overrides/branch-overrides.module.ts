import { Module } from '@nestjs/common';
import { BranchOverridesService } from './branch-overrides.service';
import { BranchOverridesResolver } from './branch-overrides.resolver';

@Module({
  providers: [BranchOverridesService, BranchOverridesResolver],
  exports: [BranchOverridesService],
})
export class BranchOverridesModule {}
