import { InputType, Field, ID, Int, Float } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsIn, IsBoolean, IsInt, Min, Max, IsNumber, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

// REQ179 (IPD slice 4). Every @Field carries at least one class-validator
// decorator — the global ValidationPipe's whitelist+forbidNonWhitelisted
// pair silently strips an undecorated field and then rejects the request
// for sending it.

export const IPD_PAYMENT_TYPES = ['deposit', 'interim', 'final', 'refund', 'payer_settlement'] as const;
export const TENDER_TYPES = ['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'insurance'] as const;

@InputType()
export class IpdPackageInclusionInput {
  @Field(() => ID) @IsNotEmpty() product_id: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(1) max_quantity?: number;
}

@InputType()
export class CreateIpdPackageInput {
  @Field(() => ID) @IsNotEmpty() clinic_id: string;
  @Field() @IsNotEmpty() name: string;
  @Field({ nullable: true }) @IsOptional() specialty?: string;
  @Field(() => Float) @IsNumber() @Min(0) price: number;
  @Field(() => [IpdPackageInclusionInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IpdPackageInclusionInput)
  inclusions: IpdPackageInclusionInput[];
}

@InputType()
export class UpdateIpdPackageInput {
  @Field({ nullable: true }) @IsOptional() name?: string;
  @Field({ nullable: true }) @IsOptional() specialty?: string;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @Min(0) price?: number;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
  @Field(() => [IpdPackageInclusionInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IpdPackageInclusionInput)
  inclusions?: IpdPackageInclusionInput[];
}

@InputType()
export class SelectIpdPackageInput {
  @Field(() => ID) @IsNotEmpty() admission_id: string;
  @Field(() => ID) @IsNotEmpty() package_id: string;
}

@InputType()
export class PostManualIpdChargeInput {
  @Field(() => ID) @IsNotEmpty() admission_id: string;
  @Field() @IsNotEmpty() description: string;
  @Field({ nullable: true }) @IsOptional() service_date?: Date;
  @Field(() => ID, { nullable: true }) @IsOptional() product_id?: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(1) quantity?: number;
  // Required only when no product_id is given (a pure ad-hoc line) --
  // validated in the service, not here, since it is conditional on a
  // sibling field.
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() unit_price?: number;
}

@InputType()
export class ReverseIpdChargeInput {
  @Field(() => ID) @IsNotEmpty() charge_id: string;
  @Field() @IsNotEmpty() reason: string;
}

@InputType()
export class IpdPaymentTenderInput {
  @Field() @IsIn(TENDER_TYPES as unknown as string[]) tender_type: string;
  @Field(() => Float) @IsNumber() @Min(0.01) amount: number;
  @Field({ nullable: true }) @IsOptional() reference?: string;
}

@InputType()
export class RecordIpdPaymentInput {
  @Field(() => ID) @IsNotEmpty() admission_id: string;
  @Field() @IsIn(IPD_PAYMENT_TYPES as unknown as string[]) payment_type: string;
  @Field(() => [IpdPaymentTenderInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IpdPaymentTenderInput)
  tenders: IpdPaymentTenderInput[];
  @Field({ nullable: true }) @IsOptional() notes?: string;
}

@InputType()
export class UpdateIpdBillingSettingsInput {
  @Field({ nullable: true }) @IsOptional() @IsIn(['calendar_day', 'rolling_24h']) day_boundary_mode?: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) @Max(23) discharge_cutoff_hour?: number;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() charge_admission_day?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() charge_discharge_day?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsIn(['higher_of', 'new_ward', 'old_ward']) transfer_day_rate_policy?: string;
  @Field({ nullable: true }) @IsOptional() @IsIn(['bill_extra', 'absorb']) package_excess_policy?: string;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @Min(0) default_deposit?: number;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() auto_post_room_charges?: boolean;
  @Field(() => ID, { nullable: true }) @IsOptional() doctor_visit_charge_product_id?: string;
}
