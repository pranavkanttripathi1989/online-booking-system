import { Module } from '@nestjs/common';
import { AiClinicalService } from './ai-clinical.service';
import { AiClinicalResolver } from './ai-clinical.resolver';
import { EncountersModule } from '../encounters/encounters.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [EncountersModule, EntitlementsModule],
  providers: [AiClinicalService, AiClinicalResolver],
  exports: [AiClinicalService],
})
export class AiClinicalModule {}
