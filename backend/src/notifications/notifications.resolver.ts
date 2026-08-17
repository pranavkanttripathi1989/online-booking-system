import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { NotificationsService } from './notifications.service';
import { NotificationType, NotificationMutationResultType } from './entities/notification.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => NotificationType)
export class NotificationsResolver {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Query(() => [NotificationType])
  notifications(@Args('filter', { nullable: true }) filter: string, @CurrentUser() user: JwtPayload) {
    return this.notificationsService.findAll(filter, user);
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
}
