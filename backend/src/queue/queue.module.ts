import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QueueResolver } from './queue.resolver';

@Module({
  providers: [QueueService, QueueResolver],
  exports: [QueueService],
})
export class QueueModule {}
