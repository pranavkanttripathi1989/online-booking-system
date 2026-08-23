import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

// Public/self-serve dialect (camelCase) — this is the anonymous SaaS-signup
// wizard, not the admin-CRUD Organizations domain (`OrganizationType`), which
// has no onboarding fields and is never reachable pre-auth. Kept as its own
// type rather than widening `OrganizationType`, matching the deliberate split
// documented in CLAUDE.md's "two competing GraphQL naming dialects" section.
@ObjectType('OrganizationOnboarding')
export class OrganizationOnboardingType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field() code: string;
  @Field() contactEmail: string;
  @Field() onboardingStatus: string;
  @Field({ nullable: true }) onboardingStep?: string;
  @Field({ nullable: true }) trialEndsAt?: Date;
  @Field({ nullable: true }) ownerUserId?: string;
}

@ObjectType('SubscriptionPlan')
export class SubscriptionPlanType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field() description: string;
  // 0 signals custom/"Contact sales" pricing (Enterprise) — the column is a
  // non-nullable Int (paise), so there is no real `null` to distinguish this
  // with; the frontend renders price 0 as "Custom" rather than "Free".
  @Field(() => Int) priceMonthly: number;
  @Field(() => Int) priceYearly: number;
  @Field(() => Int, { nullable: true }) maxClinics?: number;
  @Field(() => Int, { nullable: true }) maxUsers?: number;
  @Field(() => [String]) features: string[];
}
