import { Module } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsResolver } from './prescriptions.resolver';

@Module({
  providers: [PrescriptionsService, PrescriptionsResolver],
})
export class PrescriptionsModule {}
