import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { AvailabilityService } from './availability.service';
import {
  AvailabilityType,
  AvailabilityMutationResultType,
  ClinicianAvailabilitySlotType,
  LunchBreakSlotType,
  SavedIdResultType,
  AvailabilityRoomOptionType,
  SessionAvailabilityType,
} from './entities/availability.entity';
import { CreateAvailabilityInput, UpdateAvailabilityInput, ClinicianAvailabilityInput, LunchBreakInput, SearchInput } from './dto/availability.input';
import { AvailableSlotType } from './entities/available-slot.entity';
import { DateOnlyMarker } from '../common/scalars/date.scalar';
import { Auth } from '../common/decorators/auth.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver()
export class AvailabilityResolver {
  constructor(private readonly availabilityService: AvailabilityService) {}

  // BUG012: this had no @Auth() at all -- any authenticated role (including
  // patient/clinician) could list every availability template in their org.
  // 'staff' is included alongside the mutations' manager/admin/super_admin
  // because calendar/index.jsx (nav-listed for staff, no RoleGuard) is a
  // real caller of this exact query.
  @Auth('manager', 'admin', 'super_admin', 'staff')
  @Query(() => [AvailabilityType])
  availabilities(@Args('search', { nullable: true }) search: SearchInput, @CurrentUser() user: JwtPayload) {
    return this.availabilityService.findAll(search?.limit, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => AvailabilityMutationResultType)
  createAvailability(@Args('input') input: CreateAvailabilityInput, @CurrentUser() user: JwtPayload) {
    return this.availabilityService.create(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => AvailabilityMutationResultType)
  updateAvailability(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateAvailabilityInput, @CurrentUser() user: JwtPayload) {
    return this.availabilityService.update(id, input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => AvailabilityMutationResultType)
  deleteAvailability(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.availabilityService.remove(id, user);
  }

  // ── clinician/Availability.jsx self-service surface ──────────────────────
  // Also the only source of slot data for the public doctor-profile page
  // (pages/public/doctor-profile.jsx's GetClinicianProfile query calls this
  // alongside the @Public() getClinician) — @Public() here since it's just
  // day/start/end times, nothing patient- or PII-sensitive, and a patient
  // genuinely needs to see a clinician's open hours before booking/logging
  // in. Was missing this entirely, so every anonymous visitor to a doctor
  // profile page got "Unauthorized" for the whole combined query (one
  // unauthorized field nulls the entire GraphQL response).
  @Public()
  @Query(() => [ClinicianAvailabilitySlotType])
  getClinicianAvailability(@Args('clinicianId', { type: () => ID }) clinicianId: string) {
    return this.availabilityService.getClinicianAvailability(clinicianId);
  }

  @Query(() => [LunchBreakSlotType])
  getLunchBreaks(@Args('clinicianId', { type: () => ID }) clinicianId: string) {
    return this.availabilityService.getLunchBreaks(clinicianId);
  }

  // getClinician moved to PublicModule (public.resolver.ts) — that domain
  // grew a much richer shape (booking.jsx/doctor-profile.jsx need
  // name/email/bio/languages/products/education), and GraphQL only allows
  // one resolver per field name, so this file no longer owns it.

  @Query(() => [AvailabilityRoomOptionType])
  getRooms(@Args('clinicId', { type: () => ID }) clinicId: string) {
    return this.availabilityService.getRooms(clinicId);
  }

  @Auth('manager', 'admin', 'super_admin', 'clinician')
  @Mutation(() => SavedIdResultType)
  saveClinicianAvailability(@Args('input') input: ClinicianAvailabilityInput, @CurrentUser() user: JwtPayload) {
    return this.availabilityService.saveClinicianAvailability(input, user);
  }

  @Auth('manager', 'admin', 'super_admin', 'clinician')
  @Mutation(() => Boolean)
  deleteClinicianAvailability(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.availabilityService.deleteClinicianAvailability(id, user);
  }

  @Auth('manager', 'admin', 'super_admin', 'clinician')
  @Mutation(() => SavedIdResultType)
  saveLunchBreak(@Args('input') input: LunchBreakInput, @CurrentUser() user: JwtPayload) {
    return this.availabilityService.saveLunchBreak(input, user);
  }

  @Auth('manager', 'admin', 'super_admin', 'clinician')
  @Mutation(() => Boolean)
  deleteLunchBreak(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.availabilityService.deleteLunchBreak(id, user);
  }

  @Query(() => [AvailableSlotType])
  availableSlots(
    @Args('clinician_id', { type: () => ID }) clinicianId: string,
    @Args('date', { type: () => DateOnlyMarker }) date: string,
    @Args('service_id', { type: () => ID, nullable: true }) serviceId?: string,
  ) {
    return this.availabilityService.availableSlots(clinicianId, date, serviceId);
  }

  // Public to match getClinicianAvailability's own precedent — the public
  // booking wizard needs this pre-login to decide whether to render the
  // slot grid or the session "join" card for a given day.
  @Public()
  @Query(() => SessionAvailabilityType, { nullable: true })
  sessionAvailability(
    @Args('clinician_id', { type: () => ID }) clinicianId: string,
    @Args('date', { type: () => DateOnlyMarker }) date: string,
    @Args('service_id', { type: () => ID, nullable: true }) serviceId?: string,
  ) {
    return this.availabilityService.sessionAvailability(clinicianId, date, serviceId);
  }
}
