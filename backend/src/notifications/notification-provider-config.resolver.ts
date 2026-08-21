import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { NotificationProviderConfigService } from './notification-provider-config.service';
import {
  NotificationProviderOptionType,
  NotificationProviderConfigType,
  NotificationProviderConfigResultType,
  UpdateNotificationProviderConfigInput,
} from './entities/notification-provider.entity';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver()
export class NotificationProviderConfigResolver {
  constructor(private readonly service: NotificationProviderConfigService) {}

  @Query(() => [NotificationProviderOptionType])
  notificationProviders() {
    return this.service.providers();
  }

  @Auth('manager', 'admin', 'super_admin')
  @Query(() => NotificationProviderConfigType, { nullable: true })
  myNotificationProviderConfig(@Args('channel') channel: string, @CurrentUser() user: JwtPayload) {
    return this.service.myProviderConfig(channel, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => NotificationProviderConfigResultType)
  updateMyNotificationProviderConfig(
    @Args('input') input: UpdateNotificationProviderConfigInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateMyProviderConfig(input, user);
  }
}
