import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QueueResolver } from './queue.resolver';
import { ChecklistModule } from '../checklist/checklist.module';

@Module({
  imports: [ChecklistModule],
  providers: [QueueService, QueueResolver],
  exports: [QueueService],
})
export class QueueModule {}
