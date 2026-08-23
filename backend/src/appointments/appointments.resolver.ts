import { Resolver, Query, Mutation, Subscription, Args, ID, Int } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { AppointmentsService, APPOINTMENT_UPDATED_EVENT } from './appointments.service';
import { AppointmentType, AppointmentPaginatedType } from './entities/appointment.entity';
import { AppointmentFiltersInput } from './dto/appointment-filters.input';
import { AppointmentInput, AppointmentUpdateInput } from './dto/appointment.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PUB_SUB } from '../common/pubsub.provider';

@Resolver(() => AppointmentType)
export class AppointmentsResolver {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  // Matches graphql/subscriptions.js's APPOINTMENT_UPDATED_SUBSCRIPTION(clinician_id: ID)
  // exactly, consumed live by calendar/index.jsx's client.cache.modify patch.
  // clinician_id is an optional server-side filter, not a required argument —
  // omitting it (e.g. an admin viewing all clinicians) receives every update.
  @Auth('manager', 'admin', 'super_admin', 'clinician', 'staff', 'receptionist')
  @Subscription(() => AppointmentType, {
    filter: (payload, variables) =>
      !variables.clinician_id || payload.appointmentUpdated.clinician.id === variables.clinician_id,
  })
  appointmentUpdated(@Args('clinician_id', { type: () => ID, nullable: true }) _clinicianId?: string) {
    return this.pubSub.asyncIterableIterator(APPOINTMENT_UPDATED_EVENT);
  }

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

  // REQ042 — waiting-room/index.jsx queue actions.
  @Auth('manager', 'admin', 'super_admin', 'clinician', 'staff', 'receptionist')
  @Mutation(() => AppointmentType)
  checkInAppointment(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.appointmentsService.checkIn(id, user);
  }

  @Auth('manager', 'admin', 'super_admin', 'clinician', 'staff', 'receptionist')
  @Mutation(() => AppointmentType)
  startConsultation(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.appointmentsService.startConsultation(id, user);
  }

  @Auth('manager', 'admin', 'super_admin', 'clinician', 'staff', 'receptionist')
  @Mutation(() => AppointmentType)
  resetAppointmentJourney(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.appointmentsService.resetAppointmentJourney(id, user);
  }
}
