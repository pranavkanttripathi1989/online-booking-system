import { InputType, Field } from '@nestjs/graphql';
import { IsIn, IsBoolean, IsOptional, Matches } from 'class-validator';

export const NOTIFICATION_EVENT_TYPES = [
  'new_appointment',
  'appointment_reminder',
  'appointment_cancelled',
  'new_message',
  'new_review',
  'payment_received',
  'system_announcement',
] as const;

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

@InputType('NotificationPreferenceInput')
export class NotificationPreferenceInput {
  @Field() @IsIn(NOTIFICATION_EVENT_TYPES) event_type: string;
  @Field() @IsBoolean() email_enabled: boolean;
  @Field() @IsBoolean() sms_enabled: boolean;
  @Field() @IsBoolean() app_enabled: boolean;
  // REQ025 (US-NOT-01 remainder) — mirrors the three flags above exactly.
  @Field() @IsBoolean() whatsapp_enabled: boolean;
  // REQ025 (US-NOT-04) — "HH:MM", both-or-neither is validated at the
  // service layer (a single-sided quiet-hours window is meaningless).
  @Field({ nullable: true }) @IsOptional() @Matches(HHMM) quiet_hours_start?: string;
  @Field({ nullable: true }) @IsOptional() @Matches(HHMM) quiet_hours_end?: string;
}
