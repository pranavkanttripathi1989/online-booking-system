import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { BookingWidgetService } from './booking-widget.service';
import { BookingWidgetConfigType, BookingWidgetMutationResultType } from './entities/booking-widget.entity';
import { BookingWidgetConfigInput } from './dto/booking-widget.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => BookingWidgetConfigType)
export class BookingWidgetResolver {
  constructor(private readonly bookingWidgetService: BookingWidgetService) {}

  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [BookingWidgetConfigType])
  bookingWidgetConfigs(@CurrentUser() user: JwtPayload) {
    return this.bookingWidgetService.findAll(user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Query(() => BookingWidgetConfigType, { nullable: true })
  bookingWidgetConfig(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.bookingWidgetService.findOne(id, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => BookingWidgetMutationResultType)
  createBookingWidgetConfig(@Args('input') input: BookingWidgetConfigInput, @CurrentUser() user: JwtPayload) {
    return this.bookingWidgetService.create(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => BookingWidgetMutationResultType)
  updateBookingWidgetConfig(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: BookingWidgetConfigInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.bookingWidgetService.update(id, input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => BookingWidgetMutationResultType)
  deactivateBookingWidgetConfig(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.bookingWidgetService.deactivate(id, user);
  }
}
