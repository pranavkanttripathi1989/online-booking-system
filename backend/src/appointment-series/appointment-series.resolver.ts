import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { AppointmentSeriesService } from './appointment-series.service';
import { AppointmentSeriesType, CreateAppointmentSeriesResultType, CancelAppointmentSeriesResultType } from './entities/appointment-series.entity';
import { CreateAppointmentSeriesInput, CancelAppointmentSeriesInput } from './dto/appointment-series.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ163 (P2-10) — 'patient' can view/create their own series (a real
// dependant-aware caller, self-scoped in the service — see
// AppointmentSeriesService's own loadScoped/create); write access to
// another patient's series is still rejected by the service's own
// self-scope check, not by narrowing this gate (the standing
// "widen the gate, enforce in the service" lesson this codebase hit
// before with webhooks/api-keys).
const STAFF_ROLES = ['manager', 'admin', 'super_admin', 'staff', 'clinician'] as const;

@Resolver()
export class AppointmentSeriesResolver {
  constructor(private readonly appointmentSeriesService: AppointmentSeriesService) {}

  @Query(() => [AppointmentSeriesType], { name: 'appointmentSeriesList' })
  @Auth(...STAFF_ROLES)
  appointmentSeriesList(@Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string | undefined, @CurrentUser() user: JwtPayload) {
    return this.appointmentSeriesService.list(clinicId, user);
  }

  @Query(() => AppointmentSeriesType, { name: 'appointmentSeries' })
  @Auth('patient', ...STAFF_ROLES)
  appointmentSeries(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.appointmentSeriesService.findOne(id, user);
  }

  @Mutation(() => CreateAppointmentSeriesResultType, { name: 'createAppointmentSeries' })
  @Auth('patient', ...STAFF_ROLES)
  createAppointmentSeries(@Args('input') input: CreateAppointmentSeriesInput, @CurrentUser() user: JwtPayload) {
    return this.appointmentSeriesService.create(input, user);
  }

  @Mutation(() => CancelAppointmentSeriesResultType, { name: 'cancelAppointmentSeries' })
  @Auth('patient', ...STAFF_ROLES)
  cancelAppointmentSeries(@Args('input') input: CancelAppointmentSeriesInput, @CurrentUser() user: JwtPayload) {
    return this.appointmentSeriesService.cancel(input, user);
  }
}
