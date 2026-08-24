import { Module } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { PharmacyResolver } from './pharmacy.resolver';

@Module({
  providers: [PharmacyService, PharmacyResolver],
  exports: [PharmacyService],
})
export class PharmacyModule {}
