import { InputType, Field, ID } from '@nestjs/graphql';
import { IsIn, IsArray, ArrayMinSize, IsEmail, IsOptional } from 'class-validator';

// REQ029 (US-RPT-03) — scheduled report delivery, reusing REQ025's channel
// vocabulary and dispatch infrastructure conceptually (see
// scheduled-reports.service.ts's own comment on why actual sends are
// stubbed the same way OTP SMS already is in this dev environment — no
// real AWS SES integration exists yet anywhere in this codebase).
export const REPORT_TYPES = ['daily_collections', 'patient_report_group', 'utilisation'] as const;
export const CADENCES = ['daily', 'weekly', 'monthly'] as const;
// WhatsApp deferred for this slice — it needs a per-org provider-config
// lookup (REQ025's own pattern) that email delivery doesn't; logged as
// open, not silently dropped from the requirement doc's "email or WhatsApp".
export const REPORT_CHANNELS = ['email'] as const;

@InputType('ScheduledReportInput')
export class ScheduledReportInput {
  // Live-verification finding (2026-08-24): see plans/dto/plan.input.ts's
  // own comment on the same bug class — this field had zero
  // class-validator decorators.
  @Field(() => ID, { nullable: true }) @IsOptional() clinic_id?: string;
  @Field() @IsIn(REPORT_TYPES) report_type: string;
  @Field(() => [String]) @IsArray() @ArrayMinSize(1) @IsEmail({}, { each: true }) recipients: string[];
  @Field() @IsIn(CADENCES) cadence: string;
  @Field() @IsIn(REPORT_CHANNELS) channel: string;
}
