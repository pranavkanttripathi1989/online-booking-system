import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

// REQ179 (IPD slice 4). Money is Int paise at rest, Float rupees at this
// resolver boundary — the standing codebase-wide convention. client_org_id
// is deliberately not exposed — ownership column, not display data.

@ObjectType('IpdPackageInclusion')
export class IpdPackageInclusionType {
  @Field(() => ID) id: string;
  @Field(() => ID) product_id: string;
  @Field({ nullable: true }) product_name?: string;
  @Field(() => Int, { nullable: true }) max_quantity?: number;
}

@ObjectType('IpdPackage')
export class IpdPackageType {
  @Field(() => ID) id: string;
  @Field(() => ID) clinic_id: string;
  @Field() name: string;
  @Field({ nullable: true }) specialty?: string;
  @Field(() => Float) price: number;
  @Field() is_active: boolean;
  @Field(() => [IpdPackageInclusionType]) inclusions: IpdPackageInclusionType[];
}

@ObjectType('IpdCharge')
export class IpdChargeType {
  @Field(() => ID) id: string;
  @Field() charge_type: string;
  @Field() description: string;
  @Field() service_date: Date;
  @Field(() => ID, { nullable: true }) product_id?: string;
  @Field(() => Int) quantity: number;
  @Field(() => Float) unit_price: number;
  @Field(() => Float) total: number;
  @Field(() => Float, { nullable: true }) gst_rate?: number;
  @Field(() => Float, { nullable: true }) gst_amount?: number;
  @Field() is_reversed: boolean;
  @Field() is_package_inclusive: boolean;
  @Field({ nullable: true }) posted_by_name?: string;
  @Field() created_at: Date;
}

@ObjectType('IpdPaymentTender')
export class IpdPaymentTenderType {
  @Field() tender_type: string;
  @Field(() => Float) amount: number;
  @Field({ nullable: true }) reference?: string;
}

@ObjectType('IpdPayment')
export class IpdPaymentType {
  @Field(() => ID) id: string;
  @Field() payment_type: string;
  @Field(() => Float) amount: number;
  @Field(() => [IpdPaymentTenderType]) tenders: IpdPaymentTenderType[];
  @Field() receipt_number: string;
  @Field({ nullable: true }) notes?: string;
  @Field({ nullable: true }) recorded_by_name?: string;
  @Field() created_at: Date;
}

@ObjectType('IpdBill')
export class IpdBillType {
  @Field(() => ID) id: string;
  @Field(() => ID) admission_id: string;
  @Field({ nullable: true }) admission_number?: string;
  @Field({ nullable: true }) patient_name?: string;
  @Field({ nullable: true }) bill_number?: string;
  @Field() status: string;
  @Field(() => ID, { nullable: true }) package_id?: string;
  @Field({ nullable: true }) package_name?: string;
  @Field(() => Float) gross: number;
  @Field(() => Float) paid: number;
  // Derived, never stored — gross - paid, per the file-header invariant
  // this whole domain is built to protect.
  @Field(() => Float) balance: number;
  @Field({ nullable: true }) finalized_at?: Date;
  @Field({ nullable: true }) finalized_by_name?: string;
  @Field(() => [IpdChargeType]) charges: IpdChargeType[];
  @Field(() => [IpdPaymentType]) payments: IpdPaymentType[];
  @Field() created_at: Date;
}

@ObjectType('IpdBillingSettings')
export class IpdBillingSettingsType {
  @Field() day_boundary_mode: string;
  @Field(() => Int) discharge_cutoff_hour: number;
  @Field() charge_admission_day: boolean;
  @Field() charge_discharge_day: boolean;
  @Field() transfer_day_rate_policy: string;
  @Field() package_excess_policy: string;
  @Field(() => Float) default_deposit: number;
  @Field() auto_post_room_charges: boolean;
  @Field(() => ID, { nullable: true }) doctor_visit_charge_product_id?: string;
}

@ObjectType('IpdBillingUserError')
export class IpdBillingUserErrorType {
  @Field() message: string;
}

@ObjectType('IpdBillingMutationResult')
export class IpdBillingMutationResultType {
  @Field() success: boolean;
  @Field(() => [IpdBillingUserErrorType]) userErrors: IpdBillingUserErrorType[];
}
