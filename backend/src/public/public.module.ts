import { Module } from '@nestjs/common';
import { PublicService } from './public.service';
import { PublicResolver } from './public.resolver';

@Module({
  providers: [PublicService, PublicResolver],
  exports: [PublicService],
})
export class PublicModule {}
