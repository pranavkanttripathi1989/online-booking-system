import { Module } from '@nestjs/common';
import { AppointmentSeriesService } from './appointment-series.service';
import { AppointmentSeriesResolver } from './appointment-series.resolver';
import { AppointmentsModule } from '../appointments/appointments.module';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [AppointmentsModule, PatientsModule],
  providers: [AppointmentSeriesService, AppointmentSeriesResolver],
  exports: [AppointmentSeriesService],
})
export class AppointmentSeriesModule {}
