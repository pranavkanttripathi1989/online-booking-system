import { Module } from '@nestjs/common';
import { TestResultsService } from './test-results.service';
import { TestResultsResolver } from './test-results.resolver';

@Module({
  providers: [TestResultsService, TestResultsResolver],
})
export class TestResultsModule {}
