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

@InputType('RecordCounterPaymentInput')
export class RecordCounterPaymentInput {
  @Field(() => ID) @IsNotEmpty() appointment_id: string;
  @Field(() => [PaymentTenderInput])
  @ValidateNested({ each: true })
  @Type(() => PaymentTenderInput)
  @ArrayMinSize(1)
  tenders: PaymentTenderInput[];
}
