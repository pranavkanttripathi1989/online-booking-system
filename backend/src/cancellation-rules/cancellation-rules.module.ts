import { Module } from '@nestjs/common';
import { CancellationRulesService } from './cancellation-rules.service';
import { CancellationRulesResolver } from './cancellation-rules.resolver';

@Module({
  providers: [CancellationRulesService, CancellationRulesResolver],
  exports: [CancellationRulesService],
})
export class CancellationRulesModule {}
