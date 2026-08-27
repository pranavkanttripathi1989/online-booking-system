import { Module } from '@nestjs/common';
import { TelemedicineService } from './telemedicine.service';
import { TelemedicineResolver } from './telemedicine.resolver';
import { EncountersModule } from '../encounters/encounters.module';

@Module({
  imports: [EncountersModule],
  providers: [TelemedicineService, TelemedicineResolver],
  exports: [TelemedicineService],
})
export class TelemedicineModule {}
