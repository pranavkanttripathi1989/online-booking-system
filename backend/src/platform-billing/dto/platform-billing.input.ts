import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsIn, IsBoolean } from 'class-validator';

export const PLATFORM_BILLING_GATEWAYS = ['razorpay', 'stripe'] as const;
export const PLATFORM_SUBSCRIPTION_STATUSES = ['trialing', 'active', 'past_due', 'grace', 'suspended', 'cancelled', 'non_renewing'] as const;

@InputType('CreatePlatformSubscriptionInput')
export class CreatePlatformSubscriptionInput {
  @Field(() => ID) @IsNotEmpty() client_org_id: string;
  @Field(() => ID) @IsNotEmpty() plan_id: string;
  @Field() @IsIn(PLATFORM_BILLING_GATEWAYS) gateway: string;
}

@InputType('CancelPlatformSubscriptionInput')
export class CancelPlatformSubscriptionInput {
  @Field(() => ID) @IsNotEmpty() subscription_id: string;
  @Field() @IsNotEmpty() reason: string;
  // Defaults to a graceful cancel-at-period-end (the tenant keeps paid
  // access through what they already paid for) -- an immediate cancel is
  // an explicit, separate super-admin choice, never the default for a
  // destructive cross-tenant action.
  @Field({ nullable: true }) @IsOptional() @IsBoolean() immediately?: boolean;
}
