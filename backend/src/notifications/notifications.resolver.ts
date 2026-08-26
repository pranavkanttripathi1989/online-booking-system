import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { NotificationsService } from './notifications.service';
import { NotificationBillingService } from './notification-billing.service';
import {
  NotificationType,
  NotificationMutationResultType,
  NotificationDeliveryStatType,
  NotificationPaginatedType,
  WhatsappConversationSpendType,
} from './entities/notification.entity';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => NotificationType)
export class NotificationsResolver {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly billingService: NotificationBillingService,
  ) {}

  // REQ134 (F-14 residue) — first defaults to 200 (matching
  // clampTakeMiddleware's own DEFAULT_MAX_TAKE), keeping today's
  // "fetch everything" behaviour unchanged for every caller under that
  // size while making the query genuinely bounded by construction.
  @Query(() => NotificationPaginatedType)
  notifications(
    @Args('filter', { nullable: true }) filter: string,
    @Args('first', { type: () => Int, defaultValue: 200 }) first: number,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationsService.findAll(filter, first, page, user);
  }

  // REQ134 — decoupled from the bounded list above; always the true total.
  @Query(() => Int)
  unreadNotificationCount(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.unreadCount(user);
  }

  @Mutation(() => NotificationMutationResultType)
  markNotificationRead(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.notificationsService.markRead(id, user);
  }

  @Mutation(() => NotificationMutationResultType)
  markAllNotificationsRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllRead(user);
  }

  @Mutation(() => NotificationMutationResultType)
  deleteNotification(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.notificationsService.remove(id, user);
  }

  // REQ025 (US-NOT-05).
  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [NotificationDeliveryStatType])
  notificationDeliveryAnalytics(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.deliveryAnalytics(user);
  }

  // P1-01/REQ144 — same gate as notificationDeliveryAnalytics above: this is
  // an org-operations view (spend/cap), not a patient- or clinician-facing
  // one. orgId is honoured only for a platform operator (see
  // NotificationBillingService.getConversationSpend's own scope guard) —
  // an org-scoped caller is always scoped to their own org regardless of it.
  @Auth('manager', 'admin', 'super_admin')
  @Query(() => WhatsappConversationSpendType)
  async whatsappConversationSpend(@CurrentUser() user: JwtPayload, @Args('orgId', { nullable: true }) orgId?: string) {
    const spend = await this.billingService.getConversationSpend(user, orgId);
    return {
      periodStart: spend.periodStart,
      periodEnd: spend.periodEnd,
      byCategory: spend.byCategory.map((c) => ({ category: c.category, count: c.count, costRupees: c.costMicroRupees / 1_000_000 })),
      totalCostRupees: spend.totalCostMicroRupees / 1_000_000,
    };
  }
}
