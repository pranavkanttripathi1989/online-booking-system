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
