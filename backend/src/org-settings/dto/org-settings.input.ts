import { InputType, Field, Float, Int } from '@nestjs/graphql';
import { IsOptional, IsEmail, IsBoolean, IsInt, Min, IsNotEmpty, Matches } from 'class-validator';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

@InputType('UpdateOrgCommunicationSettingsInput')
export class UpdateOrgCommunicationSettingsInput {
  @Field({ nullable: true }) @IsOptional() @IsNotEmpty() email_from_name?: string;
  @Field({ nullable: true }) @IsOptional() @IsEmail() email_from_address?: string;
  @Field({ nullable: true }) @IsOptional() @IsEmail() email_reply_to?: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() email_include_branding?: boolean;
}

// REQ024 (US-MSG-04) — all three optional; the auto-responder in
// messages.service.ts only fires once all three are set. Explicit null
// clears a field back to "not configured" (matching session_timeout_minutes'
// own nullable-clear convention below); omitted leaves it untouched.
@InputType('UpdateOrgClinicalHoursInput')
export class UpdateOrgClinicalHoursInput {
  @Field({ nullable: true }) @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'clinical_hours_start must be HH:MM' }) clinical_hours_start?: string;
  @Field({ nullable: true }) @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'clinical_hours_end must be HH:MM' }) clinical_hours_end?: string;
  @Field({ nullable: true }) @IsOptional() @IsNotEmpty() clinical_hours_auto_reply_message?: string;
}

@InputType('UpdateOrgBookingPoliciesInput')
export class UpdateOrgBookingPoliciesInput {
  @Field(() => Float, { nullable: true }) @IsOptional() @Min(0) no_show_fee?: number;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) slot_buffer_minutes?: number;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) max_reschedules_per_month?: number;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) data_retention_years?: number;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) no_show_grace_minutes?: number;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) no_show_prepayment_threshold?: number;
}

@InputType('UpdateOrgSecuritySettingsInput')
export class UpdateOrgSecuritySettingsInput {
  @Field({ nullable: true }) @IsOptional() @IsBoolean() mfa_required?: boolean;
  // Explicit null clears it (auto-logout off); omitted leaves it untouched.
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(1) session_timeout_minutes?: number;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() audit_log_enabled?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() patient_data_export_enabled?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() ip_whitelist_enabled?: boolean;
  @Field({ nullable: true }) @IsOptional() ip_whitelist?: string;
}

@InputType('UpdateOrgBrandingInput')
export class UpdateOrgBrandingInput {
  // Explicit null clears the logo (revert to the default HealthSync tile);
  // omitted leaves it untouched. Set via the separate REST upload endpoint's
  // returned URL, never a client-supplied arbitrary URL.
  @Field({ nullable: true }) @IsOptional() logo_url?: string;
  @Field({ nullable: true }) @IsOptional() @Matches(HEX_COLOR, { message: 'primary_color must be a 6-digit hex color, e.g. #006D77' }) primary_color?: string;
  @Field({ nullable: true }) @IsOptional() @Matches(HEX_COLOR, { message: 'secondary_color must be a 6-digit hex color, e.g. #00858F' }) secondary_color?: string;
}
