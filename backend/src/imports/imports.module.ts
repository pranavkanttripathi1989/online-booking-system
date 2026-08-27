import { Module } from '@nestjs/common';
import { ImportsService } from './imports.service';
import { ImportsResolver } from './imports.resolver';

@Module({
  providers: [ImportsService, ImportsResolver],
})
export class ImportsModule {}
