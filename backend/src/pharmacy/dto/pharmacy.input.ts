import { InputType, Field, ID, Int, Float } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsInt, Min, IsDateString, IsIn, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

// REQ177 -- mirrors appointment-payments' own PaymentTenderInput exactly
// (RecordCounterPaymentInput), same cash|upi|card|cheque tender shape.
const PHARMACY_TENDER_TYPES = ['cash', 'upi', 'card', 'cheque'] as const;

@InputType('PharmacyPaymentTenderInput')
export class PharmacyPaymentTenderInput {
  @Field() @IsIn(PHARMACY_TENDER_TYPES) tender_type: string;
  @Field(() => Float) @Min(0.01) amount: number; // rupees
  @Field({ nullable: true }) @IsOptional() reference?: string;
}

@InputType('RecordPharmacyPaymentInput')
export class RecordPharmacyPaymentInput {
  @Field(() => ID) @IsNotEmpty() clinic_id: string;
  @Field(() => ID) @IsNotEmpty() patient_id: string;
  @Field(() => ID, { nullable: true }) @IsOptional() prescription_id?: string;
  @Field(() => [PharmacyPaymentTenderInput])
  @ValidateNested({ each: true })
  @Type(() => PharmacyPaymentTenderInput)
  @ArrayMinSize(1)
  tenders: PharmacyPaymentTenderInput[];
}

// REQ022 (pharmacy P0) — receiving a batch of stock for one drug at one clinic.
@InputType('ReceiveStockInput')
export class ReceiveStockInput {
  @Field(() => ID) @IsNotEmpty() drug_id: string;
  @Field(() => ID) @IsNotEmpty() clinic_id: string;
  @Field() @IsNotEmpty() batch_number: string;
  @Field() @IsDateString() expiry_date: string;
  @Field(() => Int) @IsInt() @Min(1) quantity: number;
  @Field(() => Float, { nullable: true }) @IsOptional() mrp?: number; // rupees at the GraphQL boundary
}

// A manual correction (breakage, count adjustment) — quantity_delta may be
// negative; a positive delta on an existing batch is deliberately NOT
// supported here (that's receiveStock, a distinct, separately-audited
// event type).
@InputType('AdjustStockInput')
export class AdjustStockInput {
  @Field(() => ID) @IsNotEmpty() batch_id: string;
  // Live-verification finding (2026-08-24): a field with zero
  // class-validator decorators is stripped by the global ValidationPipe's
  // whitelist:true, then rejected by forbidNonWhitelisted:true ("property
  // quantity_delta should not exist") -- the exact bug class REQ020 first
  // found (a missing decorator silently rejecting every save). @IsInt()
  // alone (no @Min/@Max) since this value is deliberately signed --
  // negative for a correction/breakage, per this input's own doc comment.
  @Field(() => Int) @IsInt() quantity_delta: number;
  @Field({ nullable: true }) @IsOptional() notes?: string;
}

@InputType('DispensePrescriptionItemInput')
export class DispensePrescriptionItemInput {
  @Field(() => ID) @IsNotEmpty() prescription_item_id: string;
  @Field(() => ID) @IsNotEmpty() batch_id: string;
  @Field(() => Int) @IsInt() @Min(1) quantity: number;
}
