import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { WardsService } from './wards.service';
import { BedBoardService } from './bed-board.service';
import { WardType, BedType, BedBoardType, WardMutationResultType } from './entities/ward.entity';
import { WardInput, BedInput, BlockBedInput, BedBoardFilterInput } from './dto/ward.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { EntitlementGuard, RequiresFeature } from '../entitlements/entitlement.guard';
import { IPD_FEATURE_KEY } from './ipd-feature.constant';

// REQ179 (IPD slice 1).
//
// Auth: `staff` can read the board and beds (a receptionist assigning a bed
// needs both) but only manager+ can define wards/beds or block one — the same
// split departments.resolver.ts uses. `clinician` is included on reads so a
// doctor can see where their patients are.
//
// Entitlement: every MUTATION carries @RequiresFeature('ipd'); queries stay
// ungated deliberately — an empty bed board is harmless, whereas a blocked
// read is a confusing 403 for an org mid-upgrade. Per-handler, never in
// app.module.ts's global APP_GUARD chain (the pharmacy.resolver.ts pattern).
@Resolver(() => WardType)
export class WardsResolver {
  constructor(
    private readonly wardsService: WardsService,
    private readonly bedBoardService: BedBoardService,
  ) {}

  // ── Queries ───────────────────────────────────────────────────────────

  @Auth('staff', 'clinician', 'manager', 'admin', 'super_admin')
  @Query(() => [WardType])
  wards(@Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string, @CurrentUser() user: JwtPayload) {
    return this.wardsService.findAllWards(clinicId, user);
  }

  @Auth('staff', 'clinician', 'manager', 'admin', 'super_admin')
  @Query(() => WardType, { nullable: true })
  ward(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.wardsService.findOneWard(id, user);
  }

  @Auth('staff', 'clinician', 'manager', 'admin', 'super_admin')
  @Query(() => [BedType])
  beds(
    @Args('ward_id', { type: () => ID, nullable: true }) wardId: string,
    @Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.wardsService.findAllBeds(wardId, clinicId, user);
  }

  @Auth('staff', 'clinician', 'manager', 'admin', 'super_admin')
  @Query(() => BedBoardType)
  bedBoard(@Args('filter') filter: BedBoardFilterInput, @CurrentUser() user: JwtPayload) {
    return this.bedBoardService.bedBoard(filter, user);
  }

  // ── Mutations ─────────────────────────────────────────────────────────

  @Auth('manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => WardType)
  createWard(@Args('input') input: WardInput, @CurrentUser() user: JwtPayload) {
    return this.wardsService.createWard(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => WardType)
  updateWard(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: WardInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.wardsService.updateWard(id, input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => WardMutationResultType)
  deleteWard(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.wardsService.removeWard(id, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => BedType)
  createBed(@Args('input') input: BedInput, @CurrentUser() user: JwtPayload) {
    return this.wardsService.createBed(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => BedType)
  updateBed(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: BedInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.wardsService.updateBed(id, input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => WardMutationResultType)
  deleteBed(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.wardsService.removeBed(id, user);
  }

  // Blocking is a front-desk/housekeeping action, so `staff` is included here
  // even though ward definition is manager+.
  @Auth('staff', 'manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => BedType)
  blockBed(@Args('input') input: BlockBedInput, @CurrentUser() user: JwtPayload) {
    return this.wardsService.blockBed(input, user);
  }

  @Auth('staff', 'manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => BedType)
  releaseBed(@Args('bed_id', { type: () => ID }) bedId: string, @CurrentUser() user: JwtPayload) {
    return this.wardsService.releaseBed(bedId, user);
  }
}
