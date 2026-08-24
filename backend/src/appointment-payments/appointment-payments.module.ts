import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppointmentPaymentsService } from './appointment-payments.service';
import { AppointmentPaymentsResolver } from './appointment-payments.resolver';
import { AppointmentPaymentsWebhookController } from './appointment-payments-webhook.controller';
import { AppointmentPaymentsReconciliationService } from './appointment-payments-reconciliation.service';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  // REQ040 -- ScheduleModule.forRoot() registers @Cron support; safe to
  // import here rather than app.module.ts since this is the only module
  // with a scheduled job so far, and Nest's ScheduleModule is idempotent
  // to import more than once if a second one is ever added elsewhere.
  imports: [ScheduleModule.forRoot(), WebhooksModule],
  controllers: [AppointmentPaymentsWebhookController],
  providers: [AppointmentPaymentsService, AppointmentPaymentsResolver, AppointmentPaymentsReconciliationService],
})
export class AppointmentPaymentsModule {}
