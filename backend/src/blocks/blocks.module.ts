import { Module } from '@nestjs/common';
import { BlocksService } from './blocks.service';
import { BlocksResolver } from './blocks.resolver';

@Module({
  providers: [BlocksService, BlocksResolver],
  exports: [BlocksService],
})
export class BlocksModule {}
