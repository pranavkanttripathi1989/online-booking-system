import { InputType, Field } from '@nestjs/graphql';
import { IsUrl, IsArray, ArrayMinSize, IsIn } from 'class-validator';

// REQ030 (US-INT-02, scoped down — see webhook-dispatch.service.ts's own
// comment on what's deferred). event_types is validated against the same
// vocabulary NotificationTriggerService already dispatches on.
export const WEBHOOK_EVENT_TYPES = [
  'appointment.created',
  'appointment.confirmed',
  'appointment.cancelled',
  'payment.succeeded',
] as const;

@InputType('WebhookEndpointInput')
export class WebhookEndpointInput {
  @Field() @IsUrl({ require_tld: false }) url: string;
  @Field(() => [String]) @IsArray() @ArrayMinSize(1) @IsIn(WEBHOOK_EVENT_TYPES, { each: true }) event_types: string[];
}
