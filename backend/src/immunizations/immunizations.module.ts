import { Module } from '@nestjs/common';
import { ImmunizationsService } from './immunizations.service';
import { ImmunizationsResolver } from './immunizations.resolver';
import { ImmunizationReminderSweepService } from './immunization-reminder-sweep.service';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [PatientsModule],
  providers: [ImmunizationsService, ImmunizationsResolver, ImmunizationReminderSweepService],
})
export class ImmunizationsModule {}
