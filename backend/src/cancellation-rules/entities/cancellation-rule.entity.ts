import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

// admin/Policies.jsx's Cancellation Rules tab -- built from that page's
// already-written inline gql (REQ006), not the other way around: field
// names (hours_before, not hours_before_appointment) and the
// {success, userErrors} mutation convention are dictated by the frontend
// contract already in place before this resolver existed.
@ObjectType('CancellationRuleClinic')
export class CancellationRuleClinicType {
  @Field(() => ID) id: string;
  @Field() name: string;
}

@ObjectType('CancellationRule')
export class CancellationRuleType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field({ nullable: true }) description?: string;
  @Field(() => Int) hours_before: number;
  @Field() fee_type: string;
  @Field(() => Int) fee_amount: number;
  @Field(() => ID, { nullable: true }) clinic_id?: string;
  @Field() is_active: boolean;
  @Field(() => Int) priority: number;
  @Field(() => CancellationRuleClinicType, { nullable: true }) clinic?: CancellationRuleClinicType;
}

@ObjectType('CancellationRuleUserError')
export class CancellationRuleUserErrorType {
  @Field() message: string;
}

@ObjectType('CancellationRuleMutationResult')
export class CancellationRuleMutationResultType {
  @Field() success: boolean;
  @Field(() => [CancellationRuleUserErrorType]) userErrors: CancellationRuleUserErrorType[];
  @Field(() => CancellationRuleType, { nullable: true }) cancellationRule?: CancellationRuleType;
}
