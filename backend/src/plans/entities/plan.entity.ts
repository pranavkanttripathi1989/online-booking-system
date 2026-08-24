import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

@ObjectType('FeatureFlag')
export class FeatureFlagType {
  @Field() key: string;
  @Field() enabled: boolean;
}

@ObjectType('PlanQuota')
export class PlanQuotaType {
  @Field() key: string;
  @Field(() => Int) value: number;
}

@ObjectType('PlanVersion')
export class PlanVersionType {
  @Field(() => ID) id: string;
  @Field(() => Int) version: number;
  @Field() effective_from: Date;
  @Field({ nullable: true }) effective_until?: Date;
  @Field() billing_period: string;
  @Field(() => Float) price: number; // rupees, converted at the resolver boundary
  @Field(() => [FeatureFlagType]) feature_flags: FeatureFlagType[];
  @Field(() => [PlanQuotaType]) quotas: PlanQuotaType[];
}

// REQ032 (US-PLAN-01/02). Platform-level, not tenant-scoped.
@ObjectType('Plan')
export class PlanType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field() tier: string;
  @Field() is_active: boolean;
  @Field(() => [PlanVersionType]) versions: PlanVersionType[];
  // The version currently offered to a new subscriber — the highest
  // version with no effective_until, or the most recent if all are closed.
  @Field(() => PlanVersionType, { nullable: true }) current_version?: PlanVersionType;
}
