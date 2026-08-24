import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsResolver } from './appointments.resolver';
import { QueueModule } from '../queue/queue.module';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [QueueModule, PatientsModule],
  providers: [AppointmentsService, AppointmentsResolver],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
