import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationPreferenceType } from './entities/notification-preference.entity';
import { NotificationPreferenceInput } from './dto/notification-preference.input';
import { GenericResultType } from '../auth/entities/auth-payload.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Self-scoped off the caller's own JWT, same as account/ -- no @Auth(role)
// needed beyond the global GqlAuthGuard.
@Resolver()
export class NotificationPreferencesResolver {
  constructor(private readonly notificationPreferencesService: NotificationPreferencesService) {}

  @Query(() => [NotificationPreferenceType], { name: 'myNotificationPreferences' })
  myNotificationPreferences(@CurrentUser() user: JwtPayload) {
    return this.notificationPreferencesService.myPreferences(user);
  }

  @Mutation(() => GenericResultType, { name: 'updateMyNotificationPreferences' })
  updateMyNotificationPreferences(
    @Args('input', { type: () => [NotificationPreferenceInput] }) input: NotificationPreferenceInput[],
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationPreferencesService.updateMyPreferences(input, user);
  }
}
