import { InputType, Field, ID, Int, Float } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsBoolean, IsInt, Min, IsNumber, ValidateNested, IsIn, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

// REQ018 (US-BOOK-03).
export const PREPAYMENT_POLICIES = ['required', 'optional', 'none'] as const;

// REQ016 (US-CAT-04) — modeled as structured types with one field per
// known category/channel (matching PATIENT_CATEGORIES and
// resolveServicePrice()'s two channel literals exactly) rather than a raw
// JSON scalar, consistent with this codebase's existing convention of
// flattening a Json column into explicit typed fields (e.g. Patients'
// address_structured) rather than introducing a custom GraphQL JSON scalar
// for the first time.
@InputType('CategoryPricingInput')
export class CategoryPricingInput {
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @Min(0) general?: number;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @Min(0) corporate?: number;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @Min(0) staff?: number;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @Min(0) camp?: number;
}

@InputType('ChannelPricingInput')
export class ChannelPricingInput {
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @Min(0) online?: number;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @Min(0) walkin?: number;
}

// Matches manager/services/create.jsx's actual submitted shape exactly:
// { name, description?, duration_minutes, price, is_active }. No sku/
// product_type/category_id — Products requires the first two (auto-defaulted
// in the service layer), and this form never actually submits a category
// despite having a local `category` field (a pre-existing frontend bug,
// noted in context/phase4-5-increment3-implementation-plan.md, not fixed here).
@InputType('ServiceInput')
export class ServiceInput {
  @Field() @IsNotEmpty() name: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(1) duration_minutes?: number;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @Min(0) price?: number;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
  // REQ046 (US-CAT-06). Omitted on create → defaults to true (a healthcare
  // consultation service is GST-exempt by default); always explicit on update.
  @Field({ nullable: true }) @IsOptional() hsn?: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_tax_exempt?: boolean;
  // REQ014 (US-ORG-03) — optional specialty grouping.
  @Field(() => ID, { nullable: true }) @IsOptional() department_id?: string;
  // REQ016 (US-CAT-04) — omitted entirely leaves existing overrides
  // untouched (Prisma `undefined` semantics); an explicit object (even one
  // with all fields empty) replaces the stored overrides wholesale, matching
  // a "pricing overrides" form section submitting its current complete state.
  @Field(() => CategoryPricingInput, { nullable: true }) @IsOptional() @ValidateNested() @Type(() => CategoryPricingInput) category_pricing?: CategoryPricingInput;
  @Field(() => ChannelPricingInput, { nullable: true }) @IsOptional() @ValidateNested() @Type(() => ChannelPricingInput) channel_pricing?: ChannelPricingInput;
  // REQ018 (US-BOOK-03) — required | optional | none (default). Omitted on
  // create leaves the schema default ("none", today's existing behaviour).
  @Field({ nullable: true }) @IsOptional() @IsIn(PREPAYMENT_POLICIES) prepayment_policy?: string;
  // REQ016 (US-CAT-05) — see UpdateProductInput's identical field for the
  // full explanation. Meaningless on create (no prior price exists yet);
  // servicesService.update() is the only place this is read.
  @Field({ nullable: true }) @IsOptional() @IsDateString() effective_from?: string;
}
