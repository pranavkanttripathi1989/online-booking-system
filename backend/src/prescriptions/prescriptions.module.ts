import { Module } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsResolver } from './prescriptions.resolver';
import { PatientsModule } from '../patients/patients.module';
// REQ109 — AuthModule exported for exactly this reason (see its own
// comment: "AccountController... can verify a bearer token itself via
// JwtService") — here PrescriptionsService signs/would-verify the
// short-lived share-link token, the same JwtService instance, not a
// second JwtModule.register() with a different secret.
import { AuthModule } from '../auth/auth.module';
// REQ159 (P2-07) — reuses EncountersService.patientAllergyBanner()
// rather than re-deriving the same Diagnoses query.
import { EncountersModule } from '../encounters/encounters.module';

@Module({
  imports: [PatientsModule, AuthModule, EncountersModule],
  providers: [PrescriptionsService, PrescriptionsResolver],
  // REQ057 — documents.module.ts reuses printPrescription() rather than
  // re-deriving the same assembly logic.
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
