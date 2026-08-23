import { Module } from '@nestjs/common';
import { DrugsService } from './drugs.service';
import { DrugsResolver } from './drugs.resolver';

@Module({
  providers: [DrugsService, DrugsResolver],
})
export class DrugsModule {}
