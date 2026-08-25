import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType('OrganizationAddress')
export class OrganizationAddressType {
  @Field() line1: string;
  @Field({ nullable: true }) line2?: string;
  @Field() city: string;
  @Field() state: string;
  @Field() pincode: string;
  @Field() country: string;
}

// Registered as 'Organization' — matches admin/Organizations.jsx's only real
// consumer of this domain (frontend/src/graphql/*.js has zero Organization
// operations at all; no competing canonical contract to preserve here, unlike
// Rooms — see context/phase4-catalog-modules-implementation-plan.md).
@ObjectType('Organization')
export class OrganizationType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field() code: string;
  @Field() contactEmail: string;
  @Field({ nullable: true }) contactPhone?: string;
  @Field(() => OrganizationAddressType, { nullable: true }) address?: OrganizationAddressType;
  @Field() is_active: boolean;
}

// Read-back for OrganizationSubscriptions/SubscriptionPlans — these tables
// already existed (a row is written once during self-serve onboarding,
// organization-onboarding.service.ts#selectPlan()) but nothing ever read
// them back: no query, no admin UI. Distinct from the newer Plans/
// PlanVersions catalog builder (REQ032) — that system has no link to
// ClientOrganizations at all yet (US-PLAN-03, the entitlement guard, is
// deliberately paused). This type is for the older, already-populated table.
@ObjectType('OrganizationSubscription')
export class OrganizationSubscriptionType {
  @Field(() => ID) id: string;
  @Field() plan_name: string;
  @Field() status: string;
  @Field() billing_cycle: string;
  @Field() current_period_start: Date;
  @Field() current_period_end: Date;
  @Field() price_monthly: number; // rupees, converted from paise at the resolver boundary
  @Field() price_yearly: number;
  @Field() max_clinics: number;
  @Field() max_users: number;
}

@ObjectType('OrganizationPageInfo')
export class OrganizationPageInfoType {
  @Field() total: number;
  @Field() limit: number;
  @Field() offset: number;
  @Field() hasNextPage: boolean;
  @Field() hasPreviousPage: boolean;
}

@ObjectType('OrganizationsPaginated')
export class OrganizationsPaginatedType {
  @Field(() => [OrganizationType]) data: OrganizationType[];
  @Field(() => OrganizationPageInfoType) pageInfo: OrganizationPageInfoType;
}

@ObjectType('UserError')
export class UserErrorType {
  @Field() message: string;
  @Field({ nullable: true }) field?: string;
}

// admin/Organizations.jsx expects {success, userErrors, organization} on every
// mutation (its own established pattern, distinct from Clinics/Rooms' direct
// Type! return) — matched exactly per context/backend-hard-rules.md Rule 9.
@ObjectType('OrganizationMutationResult')
export class OrganizationMutationResultType {
  @Field() success: boolean;
  @Field(() => [UserErrorType]) userErrors: UserErrorType[];
  @Field(() => OrganizationType, { nullable: true }) organization?: OrganizationType;
}
