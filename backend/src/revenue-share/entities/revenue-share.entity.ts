import { ObjectType, Field, Float, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class RevenueShareRuleType {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  scope!: string;

  @Field(() => ID, { nullable: true })
  clinic_id?: string | null;

  @Field(() => ID, { nullable: true })
  clinician_id?: string | null;

  @Field(() => Float)
  share_percentage!: number;

  @Field(() => String, { nullable: true })
  clinic_name?: string | null;

  @Field(() => String, { nullable: true })
  clinician_name?: string | null;
}

@ObjectType()
export class PayoutType {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  clinic_id!: string;

  @Field(() => ID)
  clinician_id!: string;

  @Field(() => String)
  clinician_name!: string;

  @Field(() => String)
  period_start!: string;

  @Field(() => String)
  period_end!: string;

  // Money fields converted paise -> rupees at this resolver boundary,
  // matching every other money field in the schema (Hard Rule 9).
  @Field(() => Float)
  gross_amount!: number;

  @Field(() => Float)
  share_percentage_used!: number;

  @Field(() => Float)
  payout_amount!: number;

  @Field(() => Int)
  appointment_count!: number;

  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  approved_at?: string | null;
}

@ObjectType()
export class RevenueShareMutationResultType {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => [String], { nullable: true })
  userErrors?: string[];

  @Field(() => RevenueShareRuleType, { nullable: true })
  rule?: RevenueShareRuleType;
}

@ObjectType()
export class ComputePayoutsResultType {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => [String], { nullable: true })
  userErrors?: string[];

  @Field(() => [PayoutType])
  payouts!: PayoutType[];

  // Clinicians whose revenue in the period had no resolvable share rule
  // at any level (org/clinic/clinician) -- surfaced so a manager knows
  // to configure a rate rather than silently losing that doctor's payout.
  @Field(() => [String])
  skippedClinicianNames!: string[];
}
