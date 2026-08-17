import { Module } from '@nestjs/common';
import { CliniciansService } from './clinicians.service';
import { CliniciansResolver } from './clinicians.resolver';

@Module({
  providers: [CliniciansService, CliniciansResolver],
})
export class CliniciansModule {}
