import { Module } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { InsuranceResolver } from './insurance.resolver';
import { PatientsModule } from '../patients/patients.module';
// REQ137 — reuses PrescriptionsService#prescriptionsForEncounter to
// auto-attach a claim's own issued prescriptions as evidence, the same
// "reuse an already-exported service" pattern documents.module.ts
// established for PrescriptionsService (REQ057).
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';

@Module({
  imports: [PatientsModule, PrescriptionsModule],
  providers: [InsuranceService, InsuranceResolver],
  exports: [InsuranceService],
})
export class InsuranceModule {}
