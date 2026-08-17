import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { AppointmentsService } from './appointments.service';
import { AppointmentType, AppointmentPaginatedType } from './entities/appointment.entity';
import { AppointmentFiltersInput } from './dto/appointment-filters.input';
import { AppointmentInput, AppointmentUpdateInput } from './dto/appointment.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => AppointmentType)
export class AppointmentsResolver {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Query(() => AppointmentPaginatedType)
  appointments(
    @Args('filters', { nullable: true }) filters: AppointmentFiltersInput,
    @Args('first', { type: () => Int, defaultValue: 20 }) first: number,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.appointmentsService.findAll(filters, first, page, user);
  }

  @Query(() => AppointmentType, { nullable: true })
  appointment(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.appointmentsService.findOne(id, user);
  }

  @Auth('manager', 'admin', 'super_admin', 'clinician', 'staff', 'receptionist', 'patient')
  @Mutation(() => AppointmentType)
  createAppointment(@Args('input') input: AppointmentInput, @CurrentUser() user: JwtPayload) {
    return this.appointmentsService.create(input, user);
  }

  @Auth('manager', 'admin', 'super_admin', 'clinician', 'staff', 'receptionist')
  @Mutation(() => AppointmentType)
  updateAppointment(@Args('id', { type: () => ID }) id: string, @Args('input') input: AppointmentUpdateInput, @CurrentUser() user: JwtPayload) {
    return this.appointmentsService.update(id, input, user);
  }

  @Auth('manager', 'admin', 'super_admin', 'clinician', 'staff', 'receptionist', 'patient')
  @Mutation(() => AppointmentType)
  cancelAppointment(
    @Args('id', { type: () => ID }) id: string,
    @Args('reason', { nullable: true }) reason: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.appointmentsService.cancel(id, reason, user);
  }

  @Auth('manager', 'admin', 'super_admin', 'clinician', 'staff', 'receptionist')
  @Mutation(() => AppointmentType)
  completeAppointment(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.appointmentsService.complete(id, user);
  }

  @Auth('manager', 'admin', 'super_admin', 'clinician', 'staff', 'receptionist')
  @Mutation(() => AppointmentType)
  markNoShow(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.appointmentsService.markNoShow(id, user);
  }
}
