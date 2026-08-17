import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { AvailabilityService } from './availability.service';
import {
  AvailabilityType,
  AvailabilityMutationResultType,
  ClinicianAvailabilitySlotType,
  LunchBreakSlotType,
  SavedIdResultType,
  AvailabilityRoomOptionType,
} from './entities/availability.entity';
import { CreateAvailabilityInput, UpdateAvailabilityInput, ClinicianAvailabilityInput, LunchBreakInput, SearchInput } from './dto/availability.input';
import { AvailableSlotType } from './entities/available-slot.entity';
import { DateOnlyMarker } from '../common/scalars/date.scalar';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver()
export class AvailabilityResolver {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Query(() => [AvailabilityType])
  availabilities(@Args('search', { nullable: true }) search: SearchInput, @CurrentUser() user: JwtPayload) {
    return this.availabilityService.findAll(search?.limit, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => AvailabilityMutationResultType)
  createAvailability(@Args('input') input: CreateAvailabilityInput) {
    return this.availabilityService.create(input);
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
  saveClinicianAvailability(@Args('input') input: ClinicianAvailabilityInput) {
    return this.availabilityService.saveClinicianAvailability(input);
  }

  @Auth('manager', 'admin', 'super_admin', 'clinician')
  @Mutation(() => Boolean)
  deleteClinicianAvailability(@Args('id', { type: () => ID }) id: string) {
    return this.availabilityService.deleteClinicianAvailability(id);
  }

  @Auth('manager', 'admin', 'super_admin', 'clinician')
  @Mutation(() => SavedIdResultType)
  saveLunchBreak(@Args('input') input: LunchBreakInput) {
    return this.availabilityService.saveLunchBreak(input);
  }

  @Auth('manager', 'admin', 'super_admin', 'clinician')
  @Mutation(() => Boolean)
  deleteLunchBreak(@Args('id', { type: () => ID }) id: string) {
    return this.availabilityService.deleteLunchBreak(id);
  }

  @Query(() => [AvailableSlotType])
  availableSlots(
    @Args('clinician_id', { type: () => ID }) clinicianId: string,
    @Args('date', { type: () => DateOnlyMarker }) date: string,
    @Args('service_id', { type: () => ID, nullable: true }) serviceId?: string,
  ) {
    return this.availabilityService.availableSlots(clinicianId, date, serviceId);
  }
}
