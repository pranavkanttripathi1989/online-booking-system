import { Module } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { ResourcesResolver } from './resources.resolver';

@Module({
  providers: [ResourcesService, ResourcesResolver],
})
export class ResourcesModule {}
