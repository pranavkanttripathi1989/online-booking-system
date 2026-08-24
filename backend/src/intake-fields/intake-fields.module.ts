import { Module } from '@nestjs/common';
import { IntakeFieldsService } from './intake-fields.service';
import { IntakeFieldsResolver } from './intake-fields.resolver';

@Module({
  providers: [IntakeFieldsService, IntakeFieldsResolver],
  exports: [IntakeFieldsService],
})
export class IntakeFieldsModule {}
