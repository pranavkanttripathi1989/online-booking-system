import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType('VerifyRazorpayPaymentInput')
export class VerifyRazorpayPaymentInput {
  @Field() @IsNotEmpty() razorpay_order_id: string;
  @Field() @IsNotEmpty() razorpay_payment_id: string;
  @Field() @IsNotEmpty() razorpay_signature: string;
}
