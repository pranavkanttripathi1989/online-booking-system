import { InputType, Field, ID, Float } from '@nestjs/graphql';
import { IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsDateString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IpdPaymentTenderInput } from '../../ipd-billing/dto/ipd-billing.input';

// REQ179 (IPD slice 5) -- every state transition here has a real human
// decision point, matching Claims' (REQ131) own established stance: no
// automated payer submission exists anywhere in this codebase.
export const PRE_AUTH_STATUSES = ['requested', 'approved', 'rejected', 'expired', 'cancelled'] as const;
export const PRE_AUTH_ENHANCEMENT_STATUSES = ['requested', 'approved', 'rejected'] as const;
export const IPD_CLAIM_STATUSES = ['submitted', 'under_review', 'approved', 'partially_approved', 'rejected'] as const;
export const IPD_INSURANCE_DOCUMENT_TYPES = [
  'preauth_form',
  'discharge_summary',
  'bill',
  'payer_correspondence',
  'id_proof',
  'policy_copy',
  'other',
] as const;

@InputType('IpdCodeInput')
export class IpdCodeInput {
  @Field() @IsNotEmpty() code: string;
  @Field() @IsNotEmpty() description: string;
}

@InputType('CreatePreAuthorizationInput')
export class CreatePreAuthorizationInput {
  @Field(() => ID) @IsNotEmpty() patient_id: string;
  @Field(() => ID) @IsNotEmpty() clinic_id: string;
  @Field(() => ID) @IsNotEmpty() payer_id: string;
  @Field(() => ID, { nullable: true }) @IsOptional() policy_id?: string;
  // Nullable -- a pre-auth is routinely requested days before a real
  // admission exists (PLAN252's own account of why PreAuthorizations
  // .admission_id is nullable+@unique).
  @Field(() => ID, { nullable: true }) @IsOptional() admission_id?: string;
  @Field(() => Float) @IsNumber() @Min(0.01) requested_amount: number;
  @Field(() => [IpdCodeInput], { nullable: true }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => IpdCodeInput) diagnosis_codes?: IpdCodeInput[];
  @Field(() => [IpdCodeInput], { nullable: true }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => IpdCodeInput) procedure_codes?: IpdCodeInput[];
  @Field({ nullable: true }) @IsOptional() @IsDateString() valid_until?: string;
  @Field({ nullable: true }) @IsOptional() notes?: string;
}

@InputType('UpdatePreAuthorizationStatusInput')
export class UpdatePreAuthorizationStatusInput {
  @Field() @IsIn(PRE_AUTH_STATUSES as unknown as string[]) status: string;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @Min(0) approved_amount?: number;
  @Field({ nullable: true }) @IsOptional() preauth_number?: string;
  @Field({ nullable: true }) @IsOptional() rejection_reason?: string;
}

@InputType('BindPreAuthorizationToAdmissionInput')
export class BindPreAuthorizationToAdmissionInput {
  @Field(() => ID) @IsNotEmpty() preauth_id: string;
  @Field(() => ID) @IsNotEmpty() admission_id: string;
}

@InputType('RequestPreAuthEnhancementInput')
export class RequestPreAuthEnhancementInput {
  @Field(() => ID) @IsNotEmpty() preauth_id: string;
  @Field(() => Float) @IsNumber() @Min(0.01) requested_amount: number;
  @Field() @IsNotEmpty() reason: string;
}

@InputType('DecidePreAuthEnhancementInput')
export class DecidePreAuthEnhancementInput {
  @Field() @IsIn(['approved', 'rejected']) status: string;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @Min(0) approved_amount?: number;
  @Field({ nullable: true }) @IsOptional() rejection_reason?: string;
}

@InputType('CreateIpdClaimInput')
export class CreateIpdClaimInput {
  @Field(() => ID) @IsNotEmpty() admission_id: string;
  // Defaults from the admission's own payer/policy when omitted -- the
  // clerk overrides only when the claim genuinely routes differently.
  @Field(() => ID, { nullable: true }) @IsOptional() payer_id?: string;
  @Field(() => ID, { nullable: true }) @IsOptional() policy_id?: string;
  @Field(() => Float) @IsNumber() @Min(0.01) claimed_amount: number;
  @Field({ nullable: true }) @IsOptional() notes?: string;
}

@InputType('UpdateIpdClaimStatusInput')
export class UpdateIpdClaimStatusInput {
  @Field() @IsIn(IPD_CLAIM_STATUSES as unknown as string[]) status: string;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @Min(0) approved_amount?: number;
  @Field({ nullable: true }) @IsOptional() rejection_reason?: string;
}

@InputType('SettleIpdClaimInput')
export class SettleIpdClaimInput {
  @Field(() => [IpdPaymentTenderInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IpdPaymentTenderInput)
  tenders: IpdPaymentTenderInput[];
  @Field({ nullable: true }) @IsOptional() notes?: string;
}

@InputType('AddIpdClaimDeductionInput')
export class AddIpdClaimDeductionInput {
  @Field(() => ID) @IsNotEmpty() claim_id: string;
  @Field(() => ID, { nullable: true }) @IsOptional() charge_id?: string;
  @Field() @IsNotEmpty() description: string;
  @Field(() => Float) @IsNumber() @Min(0.01) deducted_amount: number;
}

@InputType('CreateIpdInsuranceDocumentInput')
export class CreateIpdInsuranceDocumentInput {
  @Field(() => ID, { nullable: true }) @IsOptional() preauth_id?: string;
  @Field(() => ID, { nullable: true }) @IsOptional() claim_id?: string;
  @Field() @IsIn(IPD_INSURANCE_DOCUMENT_TYPES as unknown as string[]) document_type: string;
  @Field() @IsNotEmpty() file_ref: string;
  @Field() @IsNotEmpty() mime_type: string;
  @Field({ nullable: true }) @IsOptional() notes?: string;
}
