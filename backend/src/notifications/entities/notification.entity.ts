import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

// Registered 'Notification' — formalizes notifications/index.jsx's already-
// live inline contract exactly, including its {success}-only mutation
// wrapper (no userErrors — this is the real, exercised contract, Rule 9).
@ObjectType('Notification')
export class NotificationType {
  @Field(() => ID) id: string;
  @Field() title: string;
  @Field() message: string;
  @Field() type: string;
  @Field() priority: string;
  @Field() is_read: boolean;
  @Field() created_at: Date;
}

@ObjectType('NotificationMutationResult')
export class NotificationMutationResultType {
  @Field() success: boolean;
}

// REQ025 (US-NOT-05) — one row per event_type + channel + status
// combination, org-scoped. "per template" in the requirement doc's own
// wording maps onto event_type here — this codebase's notification
// dispatch is event-keyed (see notification-trigger.service.ts's own
// DEFAULTS), not template-keyed; there is no separate template concept to
// aggregate by instead.
@ObjectType('NotificationDeliveryStat')
export class NotificationDeliveryStatType {
  @Field() event_type: string;
  @Field() channel: string;
  @Field() status: string;
  @Field(() => Int) count: number;
}
