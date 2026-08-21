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
