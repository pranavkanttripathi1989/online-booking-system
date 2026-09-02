import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { IpdInsuranceService } from './ipd-insurance.service';
import {
  PreAuthorizationType,
  PreAuthEnhancementType,
  IpdClaimType,
  IpdClaimDeductionType,
  IpdInsuranceDocumentType,
  IpdInsuranceMutationResultType,
} from './entities/ipd-insurance.entity';
import {
  CreatePreAuthorizationInput,
  UpdatePreAuthorizationStatusInput,
  BindPreAuthorizationToAdmissionInput,
  RequestPreAuthEnhancementInput,
  DecidePreAuthEnhancementInput,
  CreateIpdClaimInput,
  UpdateIpdClaimStatusInput,
  SettleIpdClaimInput,
  AddIpdClaimDeductionInput,
  CreateIpdInsuranceDocumentInput,
} from './dto/ipd-insurance.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { EntitlementGuard, RequiresFeature } from '../entitlements/entitlement.guard';
import { IPD_FEATURE_KEY } from '../wards/ipd-feature.constant';

// REQ179 (IPD slice 5). Reads: staff+ (the ipd-billing.resolver.ts
// precedent -- a clinician may reasonably need to see a stay's insurance
// status). Every write here is a financial or payer-facing decision, so
// creation is front-desk+ (staff can open a pre-auth/claim/upload a
// document) while every decision (approve/reject/bind/settle/deduct) is
// manager+, matching ipd-billing.resolver.ts's own established split.
const READ_ROLES = ['staff', 'clinician', 'manager', 'admin', 'super_admin'] as const;
const FRONT_DESK_ROLES = ['staff', 'manager', 'admin', 'super_admin'] as const;
const MANAGER_ROLES = ['manager', 'admin', 'super_admin'] as const;

@Resolver()
export class IpdInsuranceResolver {
  constructor(private readonly insuranceService: IpdInsuranceService) {}

  // ── Reads ─────────────────────────────────────────────────────────────

  @Auth(...READ_ROLES)
  @Query(() => [PreAuthorizationType])
  preAuthorizations(
    @Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string,
    @Args('status', { type: () => String, nullable: true }) status: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.insuranceService.findPreAuthorizations(clinicId, status, user);
  }

  @Auth(...READ_ROLES)
  @Query(() => PreAuthorizationType, { nullable: true })
  preAuthorization(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.findPreAuthorization(id, user);
  }

  @Auth(...READ_ROLES)
  @Query(() => PreAuthorizationType, { nullable: true })
  admissionPreAuthorization(@Args('admission_id', { type: () => ID }) admissionId: string, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.findPreAuthorizationForAdmission(admissionId, user);
  }

  @Auth(...READ_ROLES)
  @Query(() => [IpdClaimType])
  ipdClaims(
    @Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string,
    @Args('status', { type: () => String, nullable: true }) status: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.insuranceService.findIpdClaims(clinicId, status, user);
  }

  @Auth(...READ_ROLES)
  @Query(() => IpdClaimType, { nullable: true })
  ipdClaim(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.findIpdClaim(id, user);
  }

  @Auth(...READ_ROLES)
  @Query(() => IpdClaimType, { nullable: true })
  admissionIpdClaim(@Args('admission_id', { type: () => ID }) admissionId: string, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.findIpdClaimForAdmission(admissionId, user);
  }

  // ── Pre-authorizations ───────────────────────────────────────────────

  @Auth(...FRONT_DESK_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => PreAuthorizationType)
  createPreAuthorization(@Args('input') input: CreatePreAuthorizationInput, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.createPreAuthorization(input, user);
  }

  @Auth(...MANAGER_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => PreAuthorizationType)
  updatePreAuthorizationStatus(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdatePreAuthorizationStatusInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.insuranceService.updatePreAuthorizationStatus(id, input, user);
  }

  @Auth(...MANAGER_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => PreAuthorizationType)
  bindPreAuthorizationToAdmission(@Args('input') input: BindPreAuthorizationToAdmissionInput, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.bindPreAuthorizationToAdmission(input, user);
  }

  // ── Pre-auth enhancements ────────────────────────────────────────────

  @Auth(...FRONT_DESK_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => PreAuthEnhancementType)
  requestPreAuthEnhancement(@Args('input') input: RequestPreAuthEnhancementInput, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.requestPreAuthEnhancement(input, user);
  }

  @Auth(...MANAGER_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => PreAuthEnhancementType)
  decidePreAuthEnhancement(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: DecidePreAuthEnhancementInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.insuranceService.decidePreAuthEnhancement(id, input, user);
  }

  // ── IPD claims ────────────────────────────────────────────────────────

  @Auth(...FRONT_DESK_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdClaimType)
  createIpdClaim(@Args('input') input: CreateIpdClaimInput, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.createIpdClaim(input, user);
  }

  @Auth(...MANAGER_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdClaimType)
  submitIpdClaim(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.submitIpdClaim(id, user);
  }

  @Auth(...MANAGER_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdClaimType)
  updateIpdClaimStatus(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateIpdClaimStatusInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.insuranceService.updateIpdClaimStatus(id, input, user);
  }

  @Auth(...MANAGER_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdClaimType)
  settleIpdClaim(@Args('id', { type: () => ID }) id: string, @Args('input') input: SettleIpdClaimInput, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.settleIpdClaim(id, input, user);
  }

  @Auth(...MANAGER_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdClaimDeductionType)
  addIpdClaimDeduction(@Args('input') input: AddIpdClaimDeductionInput, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.addIpdClaimDeduction(input, user);
  }

  @Auth(...MANAGER_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdInsuranceMutationResultType)
  removeIpdClaimDeduction(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.removeIpdClaimDeduction(id, user);
  }

  // ── Documents ─────────────────────────────────────────────────────────

  @Auth(...FRONT_DESK_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdInsuranceDocumentType)
  createIpdInsuranceDocument(@Args('input') input: CreateIpdInsuranceDocumentInput, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.createIpdInsuranceDocument(input, user);
  }
}
