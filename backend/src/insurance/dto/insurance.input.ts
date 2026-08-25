import { InputType, Field, ID, Float } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsIn, IsDateString, IsNumber, Min } from 'class-validator';

// REQ031 (US-INS-01) — global reference data (like Languages), no
// client_org_id: insurers/TPAs are shared across every tenant, not owned
// by one.
export const PAYER_TYPES = ['insurer', 'tpa', 'corporate', 'government_scheme'] as const;
export const EMPANELMENT_STATUSES = ['active', 'de_empanelled', 'blacklisted'] as const;

@InputType('PayerInput')
export class PayerInput {
  @Field() @IsNotEmpty() name: string;
  @Field() @IsIn(PAYER_TYPES) payer_type: string;
}

@InputType('PayerEmpanelmentInput')
export class PayerEmpanelmentInput {
  @Field(() => ID) @IsNotEmpty() payer_id: string;
  @Field(() => ID) @IsNotEmpty() clinic_id: string;
  @Field() @IsDateString() start_date: string;
  @Field({ nullable: true }) @IsOptional() @IsDateString() end_date?: string;
  @Field({ nullable: true }) @IsOptional() @IsDateString() renewal_reminder_date?: string;
}

@InputType('UpdatePayerEmpanelmentStatusInput')
export class UpdatePayerEmpanelmentStatusInput {
  @Field() @IsIn(EMPANELMENT_STATUSES) status: string;
}

// REQ031 (US-INS-03, minus OCR) — manual policy capture. OCR pre-fill is
// explicitly deferred (P1, needs a document-scan integration this pass
// doesn't add).
@InputType('PatientInsurancePolicyInput')
export class PatientInsurancePolicyInput {
  @Field(() => ID) @IsNotEmpty() patient_id: string;
  @Field(() => ID) @IsNotEmpty() payer_id: string;
  @Field() @IsNotEmpty() policy_number: string;
  @Field() @IsNotEmpty() policy_holder_name: string;
  @Field() @IsDateString() valid_from: string;
  @Field({ nullable: true }) @IsOptional() @IsDateString() valid_until?: string;
}

// REQ031 (US-INS-02) — master data only, deliberately not wired into
// billing yet (see PayerTariffs' own schema comment for why).
@InputType('PayerTariffInput')
export class PayerTariffInput {
  @Field(() => ID) @IsNotEmpty() payer_id: string;
  @Field(() => ID) @IsNotEmpty() product_id: string;
  @Field(() => Float) @IsNumber() @Min(0) tariff_price: number;
}
