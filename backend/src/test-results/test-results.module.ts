import { Module } from '@nestjs/common';
import { TestResultsService } from './test-results.service';
import { TestResultsResolver } from './test-results.resolver';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [PatientsModule],
  providers: [TestResultsService, TestResultsResolver],
})
export class TestResultsModule {}
