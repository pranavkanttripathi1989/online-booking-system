import { Module } from '@nestjs/common';
import { PublicService } from './public.service';
import { PublicResolver } from './public.resolver';
import { SlotHoldsModule } from '../slot-holds/slot-holds.module';

@Module({
  imports: [SlotHoldsModule],
  providers: [PublicService, PublicResolver],
  exports: [PublicService],
})
export class PublicModule {}
