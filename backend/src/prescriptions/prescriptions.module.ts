import { Module } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsResolver } from './prescriptions.resolver';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [PatientsModule],
  providers: [PrescriptionsService, PrescriptionsResolver],
  // REQ057 — documents.module.ts reuses printPrescription() rather than
  // re-deriving the same assembly logic.
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
