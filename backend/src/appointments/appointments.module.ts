import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppointmentsService } from './appointments.service';
import { AppointmentsResolver } from './appointments.resolver';
import { NoShowSweepService } from './no-show-sweep.service';
import { AppointmentReminderSweepService } from './appointment-reminder-sweep.service';
import { QueueModule } from '../queue/queue.module';
import { PatientsModule } from '../patients/patients.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { IntakeFieldsModule } from '../intake-fields/intake-fields.module';
import { WaitlistModule } from '../waitlist/waitlist.module';
import { BranchOverridesModule } from '../branch-overrides/branch-overrides.module';
import { SlotHoldsModule } from '../slot-holds/slot-holds.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { CancellationRulesModule } from '../cancellation-rules/cancellation-rules.module';

@Module({
  // ScheduleModule.forRoot() is idempotent -- appointment-payments.module.ts
  // already calls it too (see its own comment confirming this is safe).
  imports: [
    ScheduleModule.forRoot(),
    QueueModule,
    PatientsModule,
    WebhooksModule,
    IntakeFieldsModule,
    WaitlistModule,
    BranchOverridesModule,
    SlotHoldsModule,
    ReviewsModule,
    CancellationRulesModule,
  ],
  providers: [AppointmentsService, AppointmentsResolver, NoShowSweepService, AppointmentReminderSweepService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
