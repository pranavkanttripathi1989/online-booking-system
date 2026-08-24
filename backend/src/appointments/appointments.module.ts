import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsResolver } from './appointments.resolver';
import { QueueModule } from '../queue/queue.module';
import { PatientsModule } from '../patients/patients.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [QueueModule, PatientsModule, WebhooksModule],
  providers: [AppointmentsService, AppointmentsResolver],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
