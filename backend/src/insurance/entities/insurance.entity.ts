import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { ClinicType } from '../../clinics/entities/clinic.entity';

@ObjectType('Payer')
export class PayerType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field() payer_type: string;
  @Field() is_active: boolean;
}

@ObjectType('PayerEmpanelment')
export class PayerEmpanelmentType {
  @Field(() => ID) id: string;
  @Field(() => PayerType) payer: PayerType;
  @Field(() => ClinicType) clinic: ClinicType;
  @Field() status: string;
  @Field() start_date: Date;
  @Field({ nullable: true }) end_date?: Date;
  @Field({ nullable: true }) renewal_reminder_date?: Date;
}

@ObjectType('PatientInsurancePolicy')
export class PatientInsurancePolicyType {
  @Field(() => ID) id: string;
  @Field(() => ID) patient_id: string;
  @Field(() => PayerType) payer: PayerType;
  @Field() policy_number: string;
  @Field() policy_holder_name: string;
  @Field() valid_from: Date;
  @Field({ nullable: true }) valid_until?: Date;
  @Field() is_active: boolean;
}

// REQ031 (US-INS-02).
@ObjectType('PayerTariff')
export class PayerTariffType {
  @Field(() => ID) id: string;
  @Field(() => PayerType) payer: PayerType;
  @Field(() => ID) product_id: string;
  @Field({ nullable: true }) product_name?: string;
  @Field(() => Float) tariff_price: number;
  @Field() updated_at: Date;
}

// REQ100 — a read-only quoting result, not a billing record.
@ObjectType('PayerChargeEstimate')
export class PayerChargeEstimateType {
  @Field(() => Float, { nullable: true }) amount?: number;
  @Field() has_tariff: boolean;
}

// P2-03 — a claim's own stored diagnosis/procedure code, echoing
// ClaimCodeInput's own {code, description} shape.
@ObjectType('ClaimCode')
export class ClaimCodeType {
  @Field() code: string;
  @Field() description: string;
}

// REQ131 — a basic OPD cashless claim-tracking record. claim_amount/
// approved_amount cross the resolver boundary as rupees (Float), same
// paise->rupees convention as PayerTariffType.tariff_price above.
@ObjectType('Claim')
export class ClaimType {
  @Field(() => ID) id: string;
  @Field(() => ID) appointment_id: string;
  @Field() appointment_date: Date;
  @Field(() => ID) patient_id: string;
  @Field() patient_name: string;
  @Field(() => PayerType) payer: PayerType;
  @Field(() => ID, { nullable: true }) policy_id?: string;
  @Field(() => Float) claim_amount: number;
  @Field(() => Float, { nullable: true }) approved_amount?: number;
  @Field() status: string;
  @Field({ nullable: true }) rejection_reason?: string;
  @Field() submitted_at: Date;
  @Field({ nullable: true }) decided_at?: Date;
  @Field({ nullable: true }) settled_at?: Date;
  @Field({ nullable: true }) notes?: string;
  // P2-03
  @Field(() => [ClaimCodeType], { nullable: true }) diagnosis_codes?: ClaimCodeType[];
  @Field(() => [ClaimCodeType], { nullable: true }) procedure_codes?: ClaimCodeType[];
}

// P2-03 — the auto-drafted appeal for a rejected claim. approved_at/
// approved_by_user_id stay null while status is 'draft' -- populated only
// once a real human calls approveClaimAppeal.
@ObjectType('ClaimAppeal')
export class ClaimAppealType {
  @Field(() => ID) id: string;
  @Field(() => ID) claim_id: string;
  @Field() denial_category: string;
  @Field() draft_content: string;
  @Field() status: string;
  @Field(() => ID, { nullable: true }) approved_by_user_id?: string;
  @Field({ nullable: true }) approved_at?: Date;
  @Field() created_at: Date;
}
