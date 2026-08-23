import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { OrganizationOnboardingService } from './organization-onboarding.service';
import { StartOnboardingInput, AddOnboardingClinicInput } from './dto/organization-onboarding.input';
import { OrganizationOnboardingType, SubscriptionPlanType } from './entities/organization-onboarding.entity';
import { ClinicType } from '../clinics/entities/clinic.entity';

// Entirely anonymous flow (self-serve SaaS tenant signup) — every operation
// here is @Public() by design, not an oversight (GqlAuthGuard is global and
// fail-closed by default; see CLAUDE.md "Auth is a global guard").
@Resolver()
export class OrganizationOnboardingResolver {
  constructor(private readonly onboardingService: OrganizationOnboardingService) {}

  @Public()
  @Query(() => [SubscriptionPlanType])
  subscriptionPlans() {
    return this.onboardingService.listActivePlans();
  }

  // Mints a real login account (org owner) — same abuse surface as
  // auth.resolver.ts's register(), so it gets the same throttle budget.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Mutation(() => OrganizationOnboardingType)
  startOrganizationOnboarding(@Args('input') input: StartOnboardingInput) {
    return this.onboardingService.startOnboarding(input);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Mutation(() => OrganizationOnboardingType)
  selectOnboardingPlan(@Args('orgId') orgId: string, @Args('planId') planId: string) {
    return this.onboardingService.selectPlan(orgId, planId);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Mutation(() => ClinicType)
  addOnboardingFirstClinic(@Args('orgId') orgId: string, @Args('input') input: AddOnboardingClinicInput) {
    return this.onboardingService.addFirstClinic(orgId, input);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Mutation(() => OrganizationOnboardingType)
  completeOrganizationOnboarding(@Args('orgId') orgId: string) {
    return this.onboardingService.complete(orgId);
  }
}
