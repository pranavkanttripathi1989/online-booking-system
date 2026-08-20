import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsInt, Min, IsIn, IsBoolean } from 'class-validator';

// clinic_id is optional: admin/Policies.jsx's clinic <Select> is explicitly
// "Clinic (leave blank = global)" with a "Global (all clinics)" option that
// submits clinic_id: '' -> null. A null clinic_id means "applies to every
// clinic in the caller's org" (or, for a platform-wide admin/super_admin
// caller, every clinic on the platform) -- see cancellation-rules.service.ts.
// product_id-scoped rules exist in the schema for a not-yet-built
// per-service-rule feature, but nothing creates them today, so they're
// deliberately not exposed on this input.
@InputType('CreateCancellationRuleInput')
export class CreateCancellationRuleInput {
  @Field() @IsNotEmpty() name: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
  @Field(() => Int) @IsInt() @Min(0) hours_before: number;
  @Field() @IsIn(['fixed', 'percentage']) fee_type: string;
  @Field(() => Int) @IsInt() @Min(0) fee_amount: number;
  @Field(() => ID, { nullable: true }) @IsOptional() clinic_id?: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() priority?: number;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
}

@InputType('UpdateCancellationRuleInput')
export class UpdateCancellationRuleInput {
  @Field({ nullable: true }) @IsOptional() name?: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) hours_before?: number;
  @Field({ nullable: true }) @IsOptional() @IsIn(['fixed', 'percentage']) fee_type?: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) fee_amount?: number;
  @Field(() => ID, { nullable: true }) @IsOptional() clinic_id?: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() priority?: number;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
}
