import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConsentService } from './consent.service';
import { ConsentResolver } from './consent.resolver';
import { PatientsModule } from '../patients/patients.module';
import { RetentionPurgeService } from './retention-purge.service';

@Module({
  // ScheduleModule.forRoot() is idempotent -- see products.module.ts's own
  // identical comment.
  imports: [PatientsModule, ScheduleModule.forRoot()],
  providers: [ConsentService, ConsentResolver, RetentionPurgeService],
  exports: [ConsentService],
})
export class ConsentModule {}
