import { Module } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsResolver } from './prescriptions.resolver';

@Module({
  providers: [PrescriptionsService, PrescriptionsResolver],
  // REQ057 — documents.module.ts reuses printPrescription() rather than
  // re-deriving the same assembly logic.
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
