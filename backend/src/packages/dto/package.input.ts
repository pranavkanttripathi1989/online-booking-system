import { InputType, Field, ID, Int, Float } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsInt, Min, IsBoolean, IsIn, IsArray, ArrayMinSize } from 'class-validator';

const TENDER_TYPES = ['cash', 'upi', 'card', 'cheque'];

@InputType('CreatePackageInput')
export class CreatePackageInput {
  @Field(() => ID) @IsNotEmpty() clinic_id: string;
  @Field() @IsNotEmpty() name: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
  @Field(() => Int) @IsInt() @Min(1) total_sittings: number;
  @Field(() => Float) @Min(0) price: number; // rupees
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(1) validity_days?: number;
  @Field(() => [ID]) @IsArray() @ArrayMinSize(1) product_ids: string[];
}

@InputType('UpdatePackageInput')
export class UpdatePackageInput {
  @Field({ nullable: true }) @IsOptional() name?: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(1) total_sittings?: number;
  @Field(() => Float, { nullable: true }) @IsOptional() @Min(0) price?: number;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(1) validity_days?: number;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
}

@InputType('PurchasePackageInput')
export class PurchasePackageInput {
  @Field(() => ID) @IsNotEmpty() package_id: string;
  @Field(() => ID) @IsNotEmpty() patient_id: string;
  @Field() @IsIn(TENDER_TYPES) purchase_tender_type: string;
  @Field({ nullable: true }) @IsOptional() purchase_reference?: string;
}
