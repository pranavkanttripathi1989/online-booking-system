import { ObjectType, Field, Float, Int } from '@nestjs/graphql';

// admin/Communications.jsx "Global Settings" tab -- Email half only. See
// context/open-questions.md #6 for why the SMS provider/API-key half is
// deliberately not modeled (contradicts CLAUDE.md's fixed-vendor rule).
@ObjectType('OrgCommunicationSettings')
export class OrgCommunicationSettingsType {
  @Field() email_from_name: string;
  @Field({ nullable: true }) email_from_address?: string;
  @Field({ nullable: true }) email_reply_to?: string;
  @Field() email_include_branding: boolean;
  // P1-01/REQ144
  @Field(() => Float, { nullable: true }) whatsapp_monthly_cap_rupees?: number;
}

@ObjectType('OrgCommunicationSettingsUserError')
export class OrgCommunicationSettingsUserErrorType {
  @Field() message: string;
}

@ObjectType('OrgCommunicationSettingsMutationResult')
export class OrgCommunicationSettingsMutationResultType {
  @Field() success: boolean;
  @Field(() => [OrgCommunicationSettingsUserErrorType]) userErrors: OrgCommunicationSettingsUserErrorType[];
  @Field(() => OrgCommunicationSettingsType, { nullable: true }) settings?: OrgCommunicationSettingsType;
}

// REQ024 (US-MSG-04).
@ObjectType('OrgClinicalHours')
export class OrgClinicalHoursType {
  @Field({ nullable: true }) clinical_hours_start?: string;
  @Field({ nullable: true }) clinical_hours_end?: string;
  @Field({ nullable: true }) clinical_hours_auto_reply_message?: string;
}

@ObjectType('OrgClinicalHoursMutationResult')
export class OrgClinicalHoursMutationResultType {
  @Field() success: boolean;
  @Field(() => [OrgCommunicationSettingsUserErrorType]) userErrors: OrgCommunicationSettingsUserErrorType[];
  @Field(() => OrgClinicalHoursType, { nullable: true }) settings?: OrgClinicalHoursType;
}

// admin/Policies.jsx "Booking Policies" tab -- No-Show Fee / Slot Buffer /
// Max Reschedules / Retention only. See context/open-questions.md #7 for
// why the Cancellation Policy/Late Fee sliders are deliberately not
// modeled here (overlap with ProductCancellationRules' global-rule support).
// no_show_fee is rupees at the GraphQL boundary, paise (no_show_fee_paise)
// in the DB -- CLAUDE.md's money-storage rule, matching products' price field.
@ObjectType('OrgBookingPolicies')
export class OrgBookingPoliciesType {
  @Field(() => Float) no_show_fee: number;
  @Field(() => Int) slot_buffer_minutes: number;
  @Field(() => Int) max_reschedules_per_month: number;
  @Field(() => Int) data_retention_years: number;
  // REQ052 (US-BOOK-04)
  @Field(() => Int) no_show_grace_minutes: number;
  @Field(() => Int) no_show_prepayment_threshold: number;
}

@ObjectType('OrgBookingPoliciesUserError')
export class OrgBookingPoliciesUserErrorType {
  @Field() message: string;
}

@ObjectType('OrgBookingPoliciesMutationResult')
export class OrgBookingPoliciesMutationResultType {
  @Field() success: boolean;
  @Field(() => [OrgBookingPoliciesUserErrorType]) userErrors: OrgBookingPoliciesUserErrorType[];
  @Field(() => OrgBookingPoliciesType, { nullable: true }) policies?: OrgBookingPoliciesType;
}

// admin/Policies.jsx "Security & Privacy" tab (REQ012/PLAN021). Every field
// here has real enforcement elsewhere -- see the schema.prisma comment on
// ClientOrganizations for exactly where each one is checked.
@ObjectType('OrgSecuritySettings')
export class OrgSecuritySettingsType {
  @Field() mfa_required: boolean;
  @Field(() => Int, { nullable: true }) session_timeout_minutes?: number;
  @Field() audit_log_enabled: boolean;
  @Field() patient_data_export_enabled: boolean;
  @Field() ip_whitelist_enabled: boolean;
  @Field({ nullable: true }) ip_whitelist?: string;
}

@ObjectType('OrgSecuritySettingsUserError')
export class OrgSecuritySettingsUserErrorType {
  @Field() message: string;
}

@ObjectType('OrgSecuritySettingsMutationResult')
export class OrgSecuritySettingsMutationResultType {
  @Field() success: boolean;
  @Field(() => [OrgSecuritySettingsUserErrorType]) userErrors: OrgSecuritySettingsUserErrorType[];
  @Field(() => OrgSecuritySettingsType, { nullable: true }) settings?: OrgSecuritySettingsType;
}

// Settings -> Clinic -> Branding tab (REQ002/PLAN022). logo_url is set via
// the separate REST upload endpoint (organizations.controller.ts), not this
// mutation directly -- the frontend uploads the file first, then saves the
// returned URL here alongside the colors, same two-step flow as account
// avatar upload.
@ObjectType('OrgBranding')
export class OrgBrandingType {
  // Read-only display field (the org's real name) -- not part of
  // UpdateOrgBrandingInput, since renaming an org isn't this mutation's
  // job. Included so AppShell can show "practice name next to logo" (REQ002
  // §2's Zocdoc/Practo trust-signal finding) without a second query.
  @Field() name: string;
  @Field({ nullable: true }) logo_url?: string;
  @Field() primary_color: string;
  @Field() secondary_color: string;
}

@ObjectType('OrgBrandingUserError')
export class OrgBrandingUserErrorType {
  @Field() message: string;
}

@ObjectType('OrgBrandingMutationResult')
export class OrgBrandingMutationResultType {
  @Field() success: boolean;
  @Field(() => [OrgBrandingUserErrorType]) userErrors: OrgBrandingUserErrorType[];
  @Field(() => OrgBrandingType, { nullable: true }) branding?: OrgBrandingType;
}
