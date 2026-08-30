import { ObjectType, Field, ID, Float } from '@nestjs/graphql';

@ObjectType('MembershipPlan')
export class MembershipPlanType {
  @Field(() => ID) id: string;
  @Field(() => ID) clinic_id: string;
  @Field() name: string;
  @Field({ nullable: true }) description?: string;
  @Field(() => Float) price_monthly: number; // rupees, converted at the resolver boundary
  @Field() is_active: boolean;
}

@ObjectType('PatientMembership')
export class PatientMembershipType {
  @Field(() => ID) id: string;
  @Field(() => ID) membership_plan_id: string;
  @Field(() => ID) patient_id: string;
  @Field(() => Float) price_monthly: number; // rupees, denormalized at enroll time
  @Field() status: string;
  @Field() enrolled_at: Date;
  @Field({ nullable: true }) cancelled_at?: Date;
  @Field(() => MembershipPlanType, { nullable: true }) membershipPlan?: MembershipPlanType;
}

@ObjectType('MembershipUserError')
export class MembershipUserErrorType {
  @Field() message: string;
}

@ObjectType('MembershipPlanMutationResult')
export class MembershipPlanMutationResultType {
  @Field() success: boolean;
  @Field(() => [MembershipUserErrorType]) userErrors: MembershipUserErrorType[];
  @Field(() => MembershipPlanType, { nullable: true }) membershipPlan?: MembershipPlanType;
}

@ObjectType('EnrollMembershipResult')
export class EnrollMembershipResultType {
  @Field() success: boolean;
  @Field(() => [MembershipUserErrorType]) userErrors: MembershipUserErrorType[];
  @Field(() => PatientMembershipType, { nullable: true }) patientMembership?: PatientMembershipType;
}
