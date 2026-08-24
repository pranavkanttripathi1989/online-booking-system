import { InputType, Field, ID, Float } from '@nestjs/graphql';
import { IsNotEmpty, IsIn, IsNumber, Min, IsOptional, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

@InputType('VerifyRazorpayPaymentInput')
export class VerifyRazorpayPaymentInput {
  @Field() @IsNotEmpty() razorpay_order_id: string;
  @Field() @IsNotEmpty() razorpay_payment_id: string;
  @Field() @IsNotEmpty() razorpay_signature: string;
}

// REQ023 (US-BIL-01, scoped subset) — front-desk mixed-tender counter
// billing. One shared type across cash/UPI/card/cheque; `reference` is the
// UPI transaction id or cheque number, optional since cash has neither.
const TENDER_TYPES = ['cash', 'upi', 'card', 'cheque'] as const;

@InputType('PaymentTenderInput')
export class PaymentTenderInput {
  @Field() @IsIn(TENDER_TYPES) tender_type: string;
  @Field(() => Float) @IsNumber() @Min(0.01) amount: number; // rupees
  @Field({ nullable: true }) @IsOptional() reference?: string;
}

// REQ056 (US-BIL-03) — a discount above the org's configured threshold is
// never applied inline; see recordCounterPayment's own comment.
@InputType('RecordCounterPaymentInput')
export class RecordCounterPaymentInput {
  @Field(() => ID) @IsNotEmpty() appointment_id: string;
  @Field(() => [PaymentTenderInput])
  @ValidateNested({ each: true })
  @Type(() => PaymentTenderInput)
  @ArrayMinSize(1)
  tenders: PaymentTenderInput[];
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @Min(0.01) discount_amount?: number; // rupees
  @Field({ nullable: true }) @IsOptional() discount_reason?: string;
}

// REQ056 (US-BIL-03) — 'approve' replays the queued tenders and creates the
// real payment; 'reject' never does.
export const DISCOUNT_APPROVAL_DECISIONS = ['approve', 'reject'] as const;

@InputType('DecideDiscountApprovalInput')
export class DecideDiscountApprovalInput {
  @Field(() => ID) @IsNotEmpty() request_id: string;
  @Field() @IsIn(DISCOUNT_APPROVAL_DECISIONS) decision: string;
}

// REQ056 (US-BIL-04, scoped subset) — the staff member's own physical
// count for the day, per tender type. Compared server-side against the
// real succeeded-payment totals for that clinic/date; never trusted as
// the "expected" figure itself.
@InputType('CountedTenderInput')
export class CountedTenderInput {
  @Field() @IsIn(TENDER_TYPES) tender_type: string;
  @Field(() => Float) @IsNumber() @Min(0) amount: number; // rupees
}

@InputType('CloseCashDrawerInput')
export class CloseCashDrawerInput {
  @Field(() => ID) @IsNotEmpty() clinic_id: string;
  @Field() @IsNotEmpty() business_date: string; // YYYY-MM-DD
  @Field(() => [CountedTenderInput])
  @ValidateNested({ each: true })
  @Type(() => CountedTenderInput)
  @ArrayMinSize(1)
  counted: CountedTenderInput[];
  @Field({ nullable: true }) @IsOptional() notes?: string;
}

// REQ054 (US-CAT-01)
@InputType('RedeemPackageSittingInput')
export class RedeemPackageSittingInput {
  @Field(() => ID) @IsNotEmpty() appointment_id: string;
  @Field(() => ID) @IsNotEmpty() patient_package_id: string;
}
