import { InputType, Field, ID, Float } from '@nestjs/graphql';
import { IsArray, IsNotEmpty, IsOptional, IsIn, IsDateString, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

// REQ131 (REQ031's own P2 follow-on) — a basic OPD cashless claim-tracking
// state machine. See Claims' own schema comment for why this is manual/
// portal-assist, not a real payer API.
export const CLAIM_STATUSES = ['submitted', 'under_review', 'approved', 'rejected', 'settled'] as const;

// P2-03 -- a claim's own suggested/accepted diagnosis or procedure code,
// stored verbatim into Claims.diagnosis_codes_json/procedure_codes_json.
// Mirrors REQ154's CodeSuggestionType's own {code, description} shape
// minus matched_terms/score, which are review-time-only signal with no
// reason to persist once a human has accepted a code.
@InputType('ClaimCodeInput')
export class ClaimCodeInput {
  @Field() @IsNotEmpty() code: string;
  @Field() @IsNotEmpty() description: string;
}

@InputType('SubmitClaimInput')
export class SubmitClaimInput {
  @Field(() => ID) @IsNotEmpty() appointment_id: string;
  @Field(() => ID) @IsNotEmpty() payer_id: string;
  @Field(() => ID, { nullable: true }) @IsOptional() policy_id?: string;
  @Field(() => Float) @IsNumber() @Min(0) claim_amount: number;
  @Field({ nullable: true }) @IsOptional() notes?: string;
  // P2-03 -- optional; populated by the claims desk from REQ154's own
  // suggestClaimCodes() suggestions, reviewed and (optionally edited or
  // dropped) by the submitting human before this mutation ever fires. An
  // omitted array leaves the claim's own codes unset, unchanged behaviour
  // for every existing caller.
  @Field(() => [ClaimCodeInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClaimCodeInput)
  diagnosis_codes?: ClaimCodeInput[];
  @Field(() => [ClaimCodeInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClaimCodeInput)
  procedure_codes?: ClaimCodeInput[];
}

@InputType('UpdateClaimStatusInput')
export class UpdateClaimStatusInput {
  @Field() @IsIn(CLAIM_STATUSES) status: string;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @Min(0) approved_amount?: number;
  @Field({ nullable: true }) @IsOptional() rejection_reason?: string;
}

// P2-03 -- the "one-click accept/override" the phase plan's own FE
// requirement names: content is optional because accepting the draft
// as-is (no edits) is the common case; supplying it lets a human correct
// the auto-generated text before it counts as approved.
@InputType('ApproveClaimAppealInput')
export class ApproveClaimAppealInput {
  @Field({ nullable: true }) @IsOptional() content?: string;
}
