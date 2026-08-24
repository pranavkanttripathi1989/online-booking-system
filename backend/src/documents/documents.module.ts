import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';
import { AppointmentPaymentsModule } from '../appointment-payments/appointment-payments.module';
import { EncountersModule } from '../encounters/encounters.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrescriptionsModule, AppointmentPaymentsModule, EncountersModule, AuthModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
