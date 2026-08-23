import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationOnboardingService } from './organization-onboarding.service';
import { OrganizationOnboardingResolver } from './organization-onboarding.resolver';

@Module({
  imports: [PrismaModule],
  providers: [OrganizationOnboardingService, OrganizationOnboardingResolver],
})
export class OrganizationOnboardingModule {}
