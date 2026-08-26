import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppointmentsService } from './appointments.service';
import { AppointmentsResolver } from './appointments.resolver';
import { NoShowSweepService } from './no-show-sweep.service';
import { QueueModule } from '../queue/queue.module';
import { PatientsModule } from '../patients/patients.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { IntakeFieldsModule } from '../intake-fields/intake-fields.module';
import { WaitlistModule } from '../waitlist/waitlist.module';
import { BranchOverridesModule } from '../branch-overrides/branch-overrides.module';

@Module({
  // ScheduleModule.forRoot() is idempotent -- appointment-payments.module.ts
  // already calls it too (see its own comment confirming this is safe).
  imports: [ScheduleModule.forRoot(), QueueModule, PatientsModule, WebhooksModule, IntakeFieldsModule, WaitlistModule, BranchOverridesModule],
  providers: [AppointmentsService, AppointmentsResolver, NoShowSweepService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
