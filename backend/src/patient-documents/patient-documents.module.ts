import { Module } from '@nestjs/common';
import { PatientDocumentsService } from './patient-documents.service';
import { PatientDocumentsResolver } from './patient-documents.resolver';
import { PatientDocumentsController } from './patient-documents.controller';
import { AuthModule } from '../auth/auth.module';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [AuthModule, PatientsModule],
  controllers: [PatientDocumentsController],
  providers: [PatientDocumentsService, PatientDocumentsResolver],
})
export class PatientDocumentsModule {}
