import { Module } from '@nestjs/common';
import { ChronicRegistriesService } from './chronic-registries.service';
import { ChronicRegistriesResolver } from './chronic-registries.resolver';
import { ChronicRegistryRecallSweepService } from './chronic-registry-recall-sweep.service';

@Module({
  providers: [ChronicRegistriesService, ChronicRegistriesResolver, ChronicRegistryRecallSweepService],
})
export class ChronicRegistriesModule {}
