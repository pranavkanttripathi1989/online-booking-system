import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

@ObjectType('PlatformBillingProviderOption')
export class PlatformBillingProviderOptionType {
  @Field() id: string;
  @Field() label: string;
}

@ObjectType('PlatformSubscriptionOrg')
export class PlatformSubscriptionOrgType {
  @Field(() => ID) id: string;
  @Field() name: string;
}

@ObjectType('PlatformSubscriptionPlan')
export class PlatformSubscriptionPlanType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field() tier: string;
}

@ObjectType('PlatformSubscription')
export class PlatformSubscriptionType {
  @Field(() => ID) id: string;
  @Field(() => PlatformSubscriptionOrgType) client_org: PlatformSubscriptionOrgType;
  @Field(() => PlatformSubscriptionPlanType) plan: PlatformSubscriptionPlanType;
  @Field() billing_period: string;
  @Field(() => Float) price: number; // rupees
  @Field() status: string;
  @Field() gateway: string;
  @Field({ nullable: true }) mandate_status?: string;
  @Field({ nullable: true }) authentication_url?: string; // set only on the response to createPlatformSubscription -- where the tenant completes mandate/card setup
  @Field() current_period_start: Date;
  @Field() current_period_end: Date;
  @Field() cancel_at_period_end: boolean;
  @Field({ nullable: true }) cancelled_at?: Date;
  @Field({ nullable: true }) cancellation_reason?: string;
  @Field() created_at: Date;
}

@ObjectType('PlatformInvoice')
export class PlatformInvoiceType {
  @Field(() => ID) id: string;
  @Field(() => ID) subscription_id: string;
  @Field(() => PlatformSubscriptionOrgType) client_org: PlatformSubscriptionOrgType;
  @Field() invoice_number: string;
  @Field(() => Float) amount: number; // rupees
  @Field() status: string;
  @Field() due_date: Date;
  @Field({ nullable: true }) paid_at?: Date;
  @Field() gateway: string;
  @Field({ nullable: true }) pre_debit_notice_sent_at?: Date;
  @Field() afa_required: boolean;
  @Field({ nullable: true }) platform_gstin?: string;
  @Field({ nullable: true }) client_org_gstin?: string;
  @Field({ nullable: true }) hsn_sac_code?: string;
  @Field(() => Float, { nullable: true }) gst_rate?: number;
  @Field(() => Float, { nullable: true }) cgst_amount?: number;
  @Field(() => Float, { nullable: true }) sgst_amount?: number;
  @Field(() => Float, { nullable: true }) igst_amount?: number;
  @Field() created_at: Date;
}

@ObjectType('PlatformDunningEvent')
export class PlatformDunningEventType {
  @Field(() => ID) id: string;
  @Field(() => ID) subscription_id: string;
  @Field({ nullable: true }) invoice_id?: string;
  @Field() event_type: string;
  @Field(() => Int, { nullable: true }) attempt_number?: number;
  @Field() occurred_at: Date;
}

@ObjectType('CreatePlatformSubscriptionResult')
export class CreatePlatformSubscriptionResultType {
  @Field() success: boolean;
  @Field({ nullable: true }) message?: string;
  @Field(() => PlatformSubscriptionType, { nullable: true }) subscription?: PlatformSubscriptionType;
}

@ObjectType('PlatformBillingMutationResult')
export class PlatformBillingMutationResultType {
  @Field() success: boolean;
  @Field({ nullable: true }) message?: string;
}
