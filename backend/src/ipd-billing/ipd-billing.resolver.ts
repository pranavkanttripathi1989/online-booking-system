import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { IpdBillingService } from './ipd-billing.service';
import { RoomDayAccrualService } from './room-day-accrual.service';
import {
  IpdBillType,
  IpdChargeType,
  IpdPaymentType,
  IpdPackageType,
  IpdBillingSettingsType,
  IpdBillingMutationResultType,
} from './entities/ipd-billing.entity';
import {
  CreateIpdPackageInput,
  UpdateIpdPackageInput,
  SelectIpdPackageInput,
  PostManualIpdChargeInput,
  ReverseIpdChargeInput,
  RecordIpdPaymentInput,
  UpdateIpdBillingSettingsInput,
} from './dto/ipd-billing.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { EntitlementGuard, RequiresFeature } from '../entitlements/entitlement.guard';
import { IPD_FEATURE_KEY } from '../wards/ipd-feature.constant';

// REQ179 (IPD slice 4). Reads: staff+ (a clinician may reasonably need to
// see what a patient owes). Financially consequential mutations (reversal,
// finalize, package CRUD, settings) are manager+ — matching this codebase's
// own established split between front-desk-actionable and manager-gated
// financial operations (appointment-payments' own discount-approval-
// threshold precedent). Every mutation carries @RequiresFeature('ipd').
const READ_ROLES = ['staff', 'clinician', 'manager', 'admin', 'super_admin'] as const;
const FRONT_DESK_ROLES = ['staff', 'manager', 'admin', 'super_admin'] as const;
const MANAGER_ROLES = ['manager', 'admin', 'super_admin'] as const;

@Resolver()
export class IpdBillingResolver {
  constructor(
    private readonly billingService: IpdBillingService,
    private readonly accrualService: RoomDayAccrualService,
  ) {}

  // ── Reads ─────────────────────────────────────────────────────────────

  @Auth(...READ_ROLES)
  @Query(() => IpdBillType)
  async admissionIpdBill(@Args('admission_id', { type: () => ID }) admissionId: string, @CurrentUser() user: JwtPayload) {
    // On-read catch-up (see room-day-accrual.service.ts's own header) --
    // best-effort: a failed catch-up must never break a real bill read.
    try {
      await this.accrualService.accrueForAdmission(admissionId);
    } catch {
      // swallowed deliberately -- the cron will retry; a stale read beats a broken one.
    }
    return this.billingService.findBillForAdmission(admissionId, user);
  }

  @Auth(...READ_ROLES)
  @Query(() => IpdBillType, { nullable: true })
  ipdBill(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.billingService.findOne(id, user);
  }

  @Auth(...READ_ROLES)
  @Query(() => [IpdBillType])
  ipdBills(
    @Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string,
    @Args('status', { type: () => String, nullable: true }) status: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.billingService.findAll(clinicId, status, user);
  }

  @Auth(...READ_ROLES)
  @Query(() => [IpdPackageType])
  ipdPackages(@Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string, @CurrentUser() user: JwtPayload) {
    return this.billingService.findAllPackages(clinicId, user);
  }

  @Auth(...MANAGER_ROLES)
  @Query(() => IpdBillingSettingsType)
  ipdBillingSettings(@Args('clinic_id', { type: () => ID }) clinicId: string, @CurrentUser() user: JwtPayload) {
    return this.billingService.getSettings(clinicId, user);
  }

  // ── Charges ──────────────────────────────────────────────────────────

  @Auth(...FRONT_DESK_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdChargeType)
  postManualIpdCharge(@Args('input') input: PostManualIpdChargeInput, @CurrentUser() user: JwtPayload) {
    return this.billingService.postManualCharge(input, user);
  }

  @Auth(...MANAGER_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdChargeType)
  reverseIpdCharge(@Args('input') input: ReverseIpdChargeInput, @CurrentUser() user: JwtPayload) {
    return this.billingService.reverseCharge(input, user);
  }

  // ── Payments ──────────────────────────────────────────────────────────

  @Auth(...FRONT_DESK_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdPaymentType)
  recordIpdPayment(@Args('input') input: RecordIpdPaymentInput, @CurrentUser() user: JwtPayload) {
    return this.billingService.recordPayment(input, user);
  }

  // ── Package selection & finalization ────────────────────────────────

  @Auth(...MANAGER_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdBillType)
  selectIpdPackage(@Args('input') input: SelectIpdPackageInput, @CurrentUser() user: JwtPayload) {
    return this.billingService.selectPackage(input, user);
  }

  @Auth(...MANAGER_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdBillType)
  finalizeIpdBill(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.billingService.finalizeBill(id, user);
  }

  @Auth(...MANAGER_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdBillType)
  unfinalizeIpdBill(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.billingService.unfinalizeBill(id, user);
  }

  // ── Packages (config) ────────────────────────────────────────────────

  @Auth(...MANAGER_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdPackageType)
  createIpdPackage(@Args('input') input: CreateIpdPackageInput, @CurrentUser() user: JwtPayload) {
    return this.billingService.createPackage(input, user);
  }

  @Auth(...MANAGER_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdPackageType)
  updateIpdPackage(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateIpdPackageInput, @CurrentUser() user: JwtPayload) {
    return this.billingService.updatePackage(id, input, user);
  }

  @Auth(...MANAGER_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdBillingMutationResultType)
  deleteIpdPackage(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.billingService.removePackage(id, user);
  }

  // ── Settings (config) ────────────────────────────────────────────────

  @Auth(...MANAGER_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdBillingSettingsType)
  updateIpdBillingSettings(
    @Args('clinic_id', { type: () => ID }) clinicId: string,
    @Args('input') input: UpdateIpdBillingSettingsInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.billingService.updateSettings(clinicId, input, user);
  }
}
