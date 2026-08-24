import { InputType, Field, ID, Int, Float } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsBoolean, IsInt, Min, IsNumber } from 'class-validator';

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
}
