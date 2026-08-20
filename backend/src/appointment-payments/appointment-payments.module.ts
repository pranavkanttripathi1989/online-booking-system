import { Module } from '@nestjs/common';
import { AppointmentPaymentsService } from './appointment-payments.service';
import { AppointmentPaymentsResolver } from './appointment-payments.resolver';

@Module({
  providers: [AppointmentPaymentsService, AppointmentPaymentsResolver],
})
export class AppointmentPaymentsModule {}
