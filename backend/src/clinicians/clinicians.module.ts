import { Module } from '@nestjs/common';
import { CliniciansService } from './clinicians.service';
import { CliniciansResolver } from './clinicians.resolver';
import { DepartmentsModule } from '../departments/departments.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [DepartmentsModule, EntitlementsModule],
  providers: [CliniciansService, CliniciansResolver],
})
export class CliniciansModule {}
