import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

// REQ179 (IPD slice 5). Money is Int paise at rest, Float rupees at this
// resolver boundary -- the standing codebase-wide convention.
// client_org_id is deliberately not exposed -- ownership column, not
// display data.

@ObjectType('IpdCode')
export class IpdCodeType {
  @Field() code: string;
  @Field() description: string;
}

@ObjectType('PreAuthEnhancement')
export class PreAuthEnhancementType {
  @Field(() => ID) id: string;
  @Field(() => Int) sequence_no: number;
  @Field(() => Float) requested_amount: number;
  @Field(() => Float, { nullable: true }) approved_amount?: number;
  @Field() status: string;
  @Field(() => Float) bill_amount_at_request: number;
  @Field() reason: string;
  @Field({ nullable: true }) rejection_reason?: string;
  @Field({ nullable: true }) requested_by_name?: string;
  @Field() requested_at: Date;
  @Field({ nullable: true }) decided_at?: Date;
}

@ObjectType('PreAuthorization')
export class PreAuthorizationType {
  @Field(() => ID) id: string;
  @Field(() => ID) clinic_id: string;
  @Field(() => ID) patient_id: string;
  @Field({ nullable: true }) patient_name?: string;
  @Field(() => ID) payer_id: string;
  @Field({ nullable: true }) payer_name?: string;
  @Field(() => ID, { nullable: true }) policy_id?: string;
  @Field(() => ID, { nullable: true }) admission_id?: string;
  @Field({ nullable: true }) admission_number?: string;
  @Field() status: string;
  @Field(() => Float) requested_amount: number;
  @Field(() => Float, { nullable: true }) approved_amount?: number;
  // Derived, never stored -- approved_amount + SUM(approved enhancements).
  // Zero while the pre-auth itself is not yet approved.
  @Field(() => Float) authorized_total: number;
  @Field({ nullable: true }) preauth_number?: string;
  @Field(() => [IpdCodeType]) diagnosis_codes: IpdCodeType[];
  @Field(() => [IpdCodeType]) procedure_codes: IpdCodeType[];
  @Field({ nullable: true }) valid_until?: Date;
  @Field({ nullable: true }) rejection_reason?: string;
  @Field({ nullable: true }) notes?: string;
  @Field({ nullable: true }) requested_by_name?: string;
  @Field() requested_at: Date;
  @Field({ nullable: true }) decided_at?: Date;
  @Field(() => [PreAuthEnhancementType]) enhancements: PreAuthEnhancementType[];
  @Field() created_at: Date;
}

@ObjectType('IpdClaimDeduction')
export class IpdClaimDeductionType {
  @Field(() => ID) id: string;
  @Field(() => ID, { nullable: true }) charge_id?: string;
  @Field({ nullable: true }) charge_description?: string;
  @Field() description: string;
  @Field(() => Float) deducted_amount: number;
  @Field() created_at: Date;
}

@ObjectType('IpdClaim')
export class IpdClaimType {
  @Field(() => ID) id: string;
  @Field(() => ID) clinic_id: string;
  @Field(() => ID) admission_id: string;
  @Field({ nullable: true }) admission_number?: string;
  @Field({ nullable: true }) patient_name?: string;
  @Field(() => ID, { nullable: true }) preauth_id?: string;
  @Field(() => ID) payer_id: string;
  @Field({ nullable: true }) payer_name?: string;
  @Field(() => ID, { nullable: true }) policy_id?: string;
  @Field() status: string;
  @Field(() => Float) claimed_amount: number;
  @Field(() => Float, { nullable: true }) approved_amount?: number;
  @Field(() => Float) total_deductions: number;
  @Field({ nullable: true }) claim_number?: string;
  @Field({ nullable: true }) rejection_reason?: string;
  @Field({ nullable: true }) notes?: string;
  @Field({ nullable: true }) submitted_by_name?: string;
  @Field({ nullable: true }) submitted_at?: Date;
  @Field({ nullable: true }) decided_at?: Date;
  @Field({ nullable: true }) settled_at?: Date;
  @Field(() => [IpdClaimDeductionType]) deductions: IpdClaimDeductionType[];
  @Field() created_at: Date;
}

@ObjectType('IpdInsuranceDocument')
export class IpdInsuranceDocumentType {
  @Field(() => ID) id: string;
  @Field(() => ID, { nullable: true }) preauth_id?: string;
  @Field(() => ID, { nullable: true }) claim_id?: string;
  @Field() document_type: string;
  @Field() file_ref: string;
  @Field() mime_type: string;
  @Field({ nullable: true }) notes?: string;
  @Field({ nullable: true }) uploaded_by_name?: string;
  @Field() uploaded_at: Date;
}

@ObjectType('IpdInsuranceUserError')
export class IpdInsuranceUserErrorType {
  @Field() message: string;
}

@ObjectType('IpdInsuranceMutationResult')
export class IpdInsuranceMutationResultType {
  @Field() success: boolean;
  @Field(() => [IpdInsuranceUserErrorType]) userErrors: IpdInsuranceUserErrorType[];
}
