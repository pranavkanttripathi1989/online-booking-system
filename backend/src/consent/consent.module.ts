import { Module } from '@nestjs/common';
import { ConsentService } from './consent.service';
import { ConsentResolver } from './consent.resolver';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [PatientsModule],
  providers: [ConsentService, ConsentResolver],
  exports: [ConsentService],
})
export class ConsentModule {}
