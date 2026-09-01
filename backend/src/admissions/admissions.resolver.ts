import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AdmissionsService } from './admissions.service';
import { MlcService } from './mlc.service';
import {
  AdmissionType,
  AdmissionEventType,
  MlcRegisterType,
  AdmissionMutationResultType,
} from './entities/admission.entity';
import {
  CreateAdmissionInput,
  UpdateAdmissionInput,
  TransferAdmissionBedInput,
  DischargeAdmissionInput,
  AdmissionFilterInput,
  RecordMlcRegisterInput,
  RecordPoliceIntimationInput,
  AmendMlcRegisterInput,
} from './dto/admission.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { EntitlementGuard, RequiresFeature } from '../entitlements/entitlement.guard';
import { IPD_FEATURE_KEY } from '../wards/ipd-feature.constant';

// REQ179 (IPD slice 1).
//
// Every mutation is named verb + PascalCaseNoun, which is load-bearing rather
// than stylistic: the global AuditLogInterceptor derives its action/resource
// from the field name, so `createAdmission` produces a `create`/`Admission`
// audit row with no bespoke logging code here.
//
// Entitlement: mutations carry @RequiresFeature('ipd'); reads stay ungated
// (an empty admission list is harmless, a 403 on read is confusing). Applied
// per-handler, never in the global APP_GUARD chain.
@Resolver(() => AdmissionType)
export class AdmissionsResolver {
  constructor(
    private readonly admissionsService: AdmissionsService,
    private readonly mlcService: MlcService,
  ) {}

  // ── Queries ───────────────────────────────────────────────────────────

  @Auth('staff', 'clinician', 'manager', 'admin', 'super_admin')
  @Query(() => [AdmissionType])
  admissions(
    @Args('filter', { nullable: true }) filter: AdmissionFilterInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.admissionsService.findAll(filter, user);
  }

  @Auth('staff', 'clinician', 'manager', 'admin', 'super_admin')
  @Query(() => AdmissionType, { nullable: true })
  admission(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.admissionsService.findOne(id, user);
  }

  @Auth('staff', 'clinician', 'manager', 'admin', 'super_admin')
  @Query(() => [AdmissionEventType])
  admissionEvents(
    @Args('admission_id', { type: () => ID }) admissionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.admissionsService.events(admissionId, user);
  }

  // The MLC register is restricted more tightly than the rest of IPD: it
  // carries police-facing legal detail about assault/abuse cases, so front-desk
  // `staff` are deliberately excluded.
  @Auth('clinician', 'manager', 'admin', 'super_admin')
  @Query(() => [MlcRegisterType])
  mlcRegisters(
    @Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string,
    @Args('pending_intimation_only', { nullable: true }) pendingIntimationOnly: boolean,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.mlcService.findAll(clinicId, pendingIntimationOnly, user);
  }

  @Auth('clinician', 'manager', 'admin', 'super_admin')
  @Query(() => MlcRegisterType, { nullable: true })
  mlcRegister(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.mlcService.findOne(id, user);
  }

  // ── ADT mutations ─────────────────────────────────────────────────────

  @Auth('staff', 'clinician', 'manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => AdmissionType)
  createAdmission(@Args('input') input: CreateAdmissionInput, @CurrentUser() user: JwtPayload) {
    return this.admissionsService.create(input, user);
  }

  @Auth('staff', 'clinician', 'manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => AdmissionType)
  updateAdmission(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateAdmissionInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.admissionsService.update(id, input, user);
  }

  @Auth('staff', 'clinician', 'manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => AdmissionType)
  transferAdmissionBed(@Args('input') input: TransferAdmissionBedInput, @CurrentUser() user: JwtPayload) {
    return this.admissionsService.transferBed(input, user);
  }

  @Auth('clinician', 'manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => AdmissionType)
  dischargeAdmission(@Args('input') input: DischargeAdmissionInput, @CurrentUser() user: JwtPayload) {
    return this.admissionsService.discharge(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => AdmissionMutationResultType)
  cancelAdmission(
    @Args('id', { type: () => ID }) id: string,
    @Args('reason') reason: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.admissionsService.cancel(id, reason, user);
  }

  // ── MLC mutations ─────────────────────────────────────────────────────

  @Auth('clinician', 'manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => MlcRegisterType)
  recordMlcRegister(@Args('input') input: RecordMlcRegisterInput, @CurrentUser() user: JwtPayload) {
    return this.mlcService.record(input, user);
  }

  @Auth('clinician', 'manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => MlcRegisterType)
  recordMlcPoliceIntimation(@Args('input') input: RecordPoliceIntimationInput, @CurrentUser() user: JwtPayload) {
    return this.mlcService.recordPoliceIntimation(input, user);
  }

  @Auth('clinician', 'manager', 'admin', 'super_admin')
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => MlcRegisterType)
  amendMlcRegister(@Args('input') input: AmendMlcRegisterInput, @CurrentUser() user: JwtPayload) {
    return this.mlcService.amend(input, user);
  }
}
