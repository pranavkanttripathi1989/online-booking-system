import { InputType, Field } from '@nestjs/graphql';
import { IsIn, IsBoolean } from 'class-validator';

export const NOTIFICATION_EVENT_TYPES = [
  'new_appointment',
  'appointment_reminder',
  'appointment_cancelled',
  'new_message',
  'new_review',
  'payment_received',
  'system_announcement',
] as const;

@InputType('NotificationPreferenceInput')
export class NotificationPreferenceInput {
  @Field() @IsIn(NOTIFICATION_EVENT_TYPES) event_type: string;
  @Field() @IsBoolean() email_enabled: boolean;
  @Field() @IsBoolean() sms_enabled: boolean;
  @Field() @IsBoolean() app_enabled: boolean;
}
