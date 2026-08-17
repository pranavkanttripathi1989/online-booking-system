import { Module } from '@nestjs/common';
import { ClinicsService } from './clinics.service';
import { ClinicsResolver } from './clinics.resolver';

@Module({
  providers: [ClinicsService, ClinicsResolver],
  exports: [ClinicsService],
})
export class ClinicsModule {}
