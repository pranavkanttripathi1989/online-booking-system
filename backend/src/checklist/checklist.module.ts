import { Module } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { ChecklistResolver } from './checklist.resolver';

@Module({
  providers: [ChecklistService, ChecklistResolver],
  exports: [ChecklistService],
})
export class ChecklistModule {}
