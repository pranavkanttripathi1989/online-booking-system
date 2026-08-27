import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('EntitlementFeatureFlag')
export class EntitlementFeatureFlagType {
  @Field() key: string;
  @Field() enabled: boolean;
}

@ObjectType('EntitlementQuota')
export class EntitlementQuotaType {
  @Field() key: string;
  @Field(() => Int) value: number;
}

// P1-04 — the caller's own resolved entitlements. `is_gated: false` means
// the org has no plan assigned (or no currently-effective version) and is
// fully ungated — the frontend distinguishes this from "gated with
// everything enabled", since the upgrade-prompt UI (FRONTEND_RULES UI-11,
// SURF-20) only makes sense once a plan actually applies.
@ObjectType('OrgEntitlements')
export class OrgEntitlementsType {
  @Field() is_gated: boolean;
  @Field(() => [EntitlementFeatureFlagType]) feature_flags: EntitlementFeatureFlagType[];
  @Field(() => [EntitlementQuotaType]) quotas: EntitlementQuotaType[];
}
