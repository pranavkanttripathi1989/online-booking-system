import { Module } from '@nestjs/common';
import { LookupsService } from './lookups.service';
import { LookupsResolver } from './lookups.resolver';

@Module({
  providers: [LookupsService, LookupsResolver],
})
export class LookupsModule {}
