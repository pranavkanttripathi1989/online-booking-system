import { Module } from '@nestjs/common';
import { CliniciansService } from './clinicians.service';
import { CliniciansResolver } from './clinicians.resolver';
import { DepartmentsModule } from '../departments/departments.module';

@Module({
  imports: [DepartmentsModule],
  providers: [CliniciansService, CliniciansResolver],
})
export class CliniciansModule {}
