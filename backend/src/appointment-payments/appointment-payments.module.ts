import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppointmentPaymentsService } from './appointment-payments.service';
import { AppointmentPaymentsResolver } from './appointment-payments.resolver';
import { AppointmentPaymentsWebhookController } from './appointment-payments-webhook.controller';
import { AppointmentPaymentsReconciliationService } from './appointment-payments-reconciliation.service';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { BranchOverridesModule } from '../branch-overrides/branch-overrides.module';
import { PaymentGatewaysModule } from '../payment-gateways/payment-gateways.module';
import { GatewayWebhooksController } from './gateway-webhooks.controller';
import { CancellationRulesModule } from '../cancellation-rules/cancellation-rules.module';

@Module({
  // REQ040 -- ScheduleModule.forRoot() registers @Cron support; safe to
  // import here rather than app.module.ts since this is the only module
  // with a scheduled job so far, and Nest's ScheduleModule is idempotent
  // to import more than once if a second one is ever added elsewhere.
  imports: [ScheduleModule.forRoot(), WebhooksModule, BranchOverridesModule, PaymentGatewaysModule, CancellationRulesModule],
  controllers: [AppointmentPaymentsWebhookController, GatewayWebhooksController],
  providers: [AppointmentPaymentsService, AppointmentPaymentsResolver, AppointmentPaymentsReconciliationService],
  // REQ057 — documents.module.ts reuses invoiceForDownload() rather than
  // re-deriving the same org/self-scoping.
  exports: [AppointmentPaymentsService],
})
export class AppointmentPaymentsModule {}
