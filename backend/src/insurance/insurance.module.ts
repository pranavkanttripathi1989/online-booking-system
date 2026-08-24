import { Module } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { InsuranceResolver } from './insurance.resolver';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [PatientsModule],
  providers: [InsuranceService, InsuranceResolver],
  exports: [InsuranceService],
})
export class InsuranceModule {}
