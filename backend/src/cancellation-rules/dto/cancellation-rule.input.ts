import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsInt, Min, IsIn, IsBoolean } from 'class-validator';

// clinic_id is optional: admin/Policies.jsx's clinic <Select> is explicitly
// "Clinic (leave blank = global)" with a "Global (all clinics)" option that
// submits clinic_id: '' -> null. A null clinic_id means "applies to every
// clinic in the caller's org" (or, for a platform-wide admin/super_admin
// caller, every clinic on the platform) -- see cancellation-rules.service.ts.
// REQ177 -- product_id (per-service fee) was previously schema-only and
// deliberately unexposed ("a not-yet-built per-service-rule feature").
// Now real: leave blank for "every service", same optional-scope pattern
// as clinic_id. selectApplicableRule() in common/scheduling/
// cancellation-fee.ts treats product+clinic as the most specific match,
// clinic-only or product-only as next, and neither as the org-wide
// fallback.
@InputType('CreateCancellationRuleInput')
export class CreateCancellationRuleInput {
  @Field() @IsNotEmpty() name: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
  @Field(() => Int) @IsInt() @Min(0) hours_before: number;
  @Field() @IsIn(['fixed', 'percentage']) fee_type: string;
  @Field(() => Int) @IsInt() @Min(0) fee_amount: number;
  @Field(() => ID, { nullable: true }) @IsOptional() clinic_id?: string;
  @Field(() => ID, { nullable: true }) @IsOptional() product_id?: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() priority?: number;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
  // REQ177 -- the schema's own RuleType enum already anticipated this
  // ('cancellation'|'reschedule'); create() previously hardcoded
  // 'cancellation' and never let an admin create a reschedule-fee rule at
  // all despite the column existing since REQ006. Defaults to
  // 'cancellation' so every existing caller/test keeps working unchanged.
  @Field({ nullable: true }) @IsOptional() @IsIn(['cancellation', 'reschedule']) rule_type?: string;
}

@InputType('UpdateCancellationRuleInput')
export class UpdateCancellationRuleInput {
  @Field({ nullable: true }) @IsOptional() name?: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) hours_before?: number;
  @Field({ nullable: true }) @IsOptional() @IsIn(['fixed', 'percentage']) fee_type?: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) fee_amount?: number;
  @Field(() => ID, { nullable: true }) @IsOptional() clinic_id?: string;
  @Field(() => ID, { nullable: true }) @IsOptional() product_id?: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() priority?: number;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
  // Real bug found on re-review: admin/Policies.jsx's edit form always
  // sends rule_type as part of its own full-form spread (it's a real field
  // on ruleForm, populated on every Edit click) -- with no matching field
  // on this input type, the global ValidationPipe's forbidNonWhitelisted
  // rejected EVERY edit of an existing rule outright, not just ones
  // touching this field. The exact bug class this codebase has hit
  // repeatedly: an @InputType field the frontend sends but the DTO never
  // declared.
  @Field({ nullable: true }) @IsOptional() @IsIn(['cancellation', 'reschedule']) rule_type?: string;
}
