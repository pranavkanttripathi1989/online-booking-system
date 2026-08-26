import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';
import { AppointmentPaymentsModule } from '../appointment-payments/appointment-payments.module';
import { EncountersModule } from '../encounters/encounters.module';
// REQ138 — InsuranceModule already exports InsuranceService; no
// circular dependency (InsuranceModule imports PrescriptionsModule, not
// DocumentsModule).
import { InsuranceModule } from '../insurance/insurance.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrescriptionsModule, AppointmentPaymentsModule, EncountersModule, InsuranceModule, AuthModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
