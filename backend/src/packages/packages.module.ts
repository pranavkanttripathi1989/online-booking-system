import { Module } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { PackagesResolver } from './packages.resolver';

@Module({
  providers: [PackagesService, PackagesResolver],
  exports: [PackagesService],
})
export class PackagesModule {}
