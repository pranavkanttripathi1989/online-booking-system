import { InputType, Field, ID, Float } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Min, IsBoolean } from 'class-validator';

@InputType('CreateMembershipPlanInput')
export class CreateMembershipPlanInput {
  @Field(() => ID) @IsNotEmpty() clinic_id: string;
  @Field() @IsNotEmpty() name: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
  @Field(() => Float) @Min(0) price_monthly: number; // rupees
}

@InputType('UpdateMembershipPlanInput')
export class UpdateMembershipPlanInput {
  @Field({ nullable: true }) @IsOptional() name?: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
  @Field(() => Float, { nullable: true }) @IsOptional() @Min(0) price_monthly?: number;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
}

@InputType('EnrollPatientMembershipInput')
export class EnrollPatientMembershipInput {
  @Field(() => ID) @IsNotEmpty() patient_id: string;
  @Field(() => ID) @IsNotEmpty() membership_plan_id: string;
}

@InputType('CancelPatientMembershipInput')
export class CancelPatientMembershipInput {
  @Field(() => ID) @IsNotEmpty() patient_id: string;
}
