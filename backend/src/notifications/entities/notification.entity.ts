import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

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

// REQ134 (F-14 residue) — findAll() previously returned a plain, unbounded
// array (no `take` at all beyond the global 200-row clampTakeMiddleware
// safety net). Migrated to this codebase's own established {data,
// paginatorInfo} convention, matching TestResultPaginatedType (REQ133)
// and AppointmentPaginatedType.
@ObjectType('NotificationPaginatorInfo')
export class NotificationPaginatorInfoType {
  @Field(() => Int) count: number;
  @Field(() => Int) currentPage: number;
  @Field(() => Int) firstItem: number;
  @Field() hasMorePages: boolean;
  @Field(() => Int) lastItem: number;
  @Field(() => Int) lastPage: number;
  @Field(() => Int) perPage: number;
  @Field(() => Int) total: number;
}

@ObjectType('NotificationPaginated')
export class NotificationPaginatedType {
  @Field(() => [NotificationType]) data: NotificationType[];
  @Field(() => NotificationPaginatorInfoType) paginatorInfo: NotificationPaginatorInfoType;
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

// P1-01/REQ144 — WhatsApp conversation spend for the current IST billing
// month. costRupees is converted from the service's internal
// cost_micro_rupees at this resolver boundary (Hard Rule 9's "money
// converted to rupees only at the resolver boundary" — the internal
// micro-rupee scale exists only because Meta's real per-message rates are
// sub-paise; nothing past this boundary should ever see that unit).
@ObjectType('WhatsappCategorySpend')
export class WhatsappCategorySpendType {
  @Field() category: string;
  @Field(() => Int) count: number;
  @Field(() => Float) costRupees: number;
}

@ObjectType('WhatsappConversationSpend')
export class WhatsappConversationSpendType {
  @Field() periodStart: Date;
  @Field() periodEnd: Date;
  @Field(() => [WhatsappCategorySpendType]) byCategory: WhatsappCategorySpendType[];
  @Field(() => Float) totalCostRupees: number;
}
