import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { OperationTheatresService } from './operation-theatres.service';
import { OtBookingsService } from './ot-bookings.service';
import { OtChecklistsService } from './ot-checklists.service';
import { OtNotesService } from './ot-notes.service';
import { OtConsumablesService } from './ot-consumables.service';
import {
  OperationTheatreType,
  OtBookingType,
  OtNoteType,
  OtMutationResultType,
} from './entities/operation-theatre.entity';
import {
  CreateOperationTheatreInput,
  UpdateOperationTheatreInput,
  CreateOtBookingInput,
  CancelOtBookingInput,
  AssignOtBookingStaffInput,
  CompleteOtChecklistInput,
  CreateOtNoteInput,
  UpdateOtNoteInput,
  SignOtNoteInput,
  RecordOtConsumableInput,
} from './dto/operation-theatre.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { EntitlementGuard, RequiresFeature } from '../entitlements/entitlement.guard';
import { IPD_FEATURE_KEY } from '../wards/ipd-feature.constant';

// REQ179 (IPD slice 3). Auth mirrors wards/admissions: staff+ can read and
// operate the board; clinician included throughout since a surgeon needs
// to see and act on their own schedule. Reads ungated on the entitlement
// flag; every mutation carries @RequiresFeature('ipd').
const OT_ROLES = ['staff', 'clinician', 'manager', 'admin', 'super_admin'] as const;

@Resolver()
export class OperationTheatreResolver {
  constructor(
    private readonly theatresService: OperationTheatresService,
    private readonly bookingsService: OtBookingsService,
    private readonly checklistsService: OtChecklistsService,
    private readonly notesService: OtNotesService,
    private readonly consumablesService: OtConsumablesService,
  ) {}

  // ── Theatres ─────────────────────────────────────────────────────────

  @Auth(...OT_ROLES)
  @Query(() => [OperationTheatreType])
  operationTheatres(@Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string, @CurrentUser() user: JwtPayload) {
    return this.theatresService.findAll(clinicId, user);
  }

  @Auth(...OT_ROLES)
  @Query(() => OperationTheatreType, { nullable: true })
  operationTheatre(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.theatresService.findOne(id, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => OperationTheatreType)
  createOperationTheatre(@Args('input') input: CreateOperationTheatreInput, @CurrentUser() user: JwtPayload) {
    return this.theatresService.create(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => OperationTheatreType)
  updateOperationTheatre(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateOperationTheatreInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.theatresService.update(id, input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => OtMutationResultType)
  deleteOperationTheatre(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.theatresService.remove(id, user);
  }

  // ── Bookings ─────────────────────────────────────────────────────────

  @Auth(...OT_ROLES)
  @Query(() => OtBookingType, { nullable: true })
  otBooking(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.findOne(id, user);
  }

  @Auth(...OT_ROLES)
  @Query(() => [OtBookingType])
  admissionOtBookings(@Args('admission_id', { type: () => ID }) admissionId: string, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.findAllForAdmission(admissionId, user);
  }

  @Auth(...OT_ROLES)
  @Query(() => [OtBookingType])
  otSchedule(
    @Args('theatre_id', { type: () => ID, nullable: true }) theatreId: string,
    @Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string,
    @Args('from', { type: () => String }) from: string,
    @Args('to', { type: () => String }) to: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.bookingsService.findAllForTheatre(theatreId, clinicId, from, to, user);
  }

  @Auth(...OT_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => OtBookingType)
  createOtBooking(@Args('input') input: CreateOtBookingInput, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.create(input, user);
  }

  @Auth(...OT_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => OtBookingType)
  startOtBooking(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.start(id, user);
  }

  @Auth(...OT_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => OtBookingType)
  completeOtBooking(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.complete(id, user);
  }

  @Auth(...OT_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => OtMutationResultType)
  cancelOtBooking(@Args('input') input: CancelOtBookingInput, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.cancel(input, user);
  }

  @Auth(...OT_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => OtBookingType)
  assignOtBookingStaff(@Args('input') input: AssignOtBookingStaffInput, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.assignStaff(input, user);
  }

  @Auth(...OT_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => OtBookingType)
  removeOtBookingStaff(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.removeStaff(id, user);
  }

  // ── Checklist ────────────────────────────────────────────────────────

  @Auth(...OT_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => OtBookingType)
  async completeOtChecklist(@Args('input') input: CompleteOtChecklistInput, @CurrentUser() user: JwtPayload) {
    const bookingId = await this.checklistsService.complete(input, user);
    return this.bookingsService.findOne(bookingId, user);
  }

  // ── Operative note ───────────────────────────────────────────────────

  @Auth(...OT_ROLES)
  @Query(() => OtNoteType, { nullable: true })
  otNote(@Args('booking_id', { type: () => ID }) bookingId: string, @CurrentUser() user: JwtPayload) {
    return this.notesService.findByBooking(bookingId, user);
  }

  @Auth('clinician', 'manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => OtNoteType)
  createOtNote(@Args('input') input: CreateOtNoteInput, @CurrentUser() user: JwtPayload) {
    return this.notesService.create(input, user);
  }

  @Auth('clinician', 'manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => OtNoteType)
  updateOtNote(
    @Args('booking_id', { type: () => ID }) bookingId: string,
    @Args('input') input: UpdateOtNoteInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notesService.update(bookingId, input, user);
  }

  @Auth('clinician', 'manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => OtNoteType)
  signOtNote(@Args('input') input: SignOtNoteInput, @CurrentUser() user: JwtPayload) {
    return this.notesService.sign(input, user);
  }

  // ── Consumables ──────────────────────────────────────────────────────

  @Auth(...OT_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => OtBookingType)
  async recordOtConsumable(@Args('input') input: RecordOtConsumableInput, @CurrentUser() user: JwtPayload) {
    await this.consumablesService.record(input, user);
    return this.bookingsService.findOne(input.booking_id, user);
  }

  @Auth(...OT_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => OtMutationResultType)
  removeOtConsumable(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.consumablesService.remove(id, user);
  }
}
