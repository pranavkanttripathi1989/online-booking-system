import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { NursingService } from './nursing.service';
import { MedicationOrdersService } from './medication-orders.service';
import { MarService } from './mar.service';
import {
  IntakeOutputRecordType,
  IntakeOutputBalanceType,
  AdmissionNoteType,
  ShiftHandoverType,
  IpdMedicationOrderType,
  MedicationAdministrationType,
} from './entities/nursing.entity';
import { VitalType } from '../encounters/entities/encounter.entity';
import {
  RecordAdmissionVitalsInput,
  RecordIntakeOutputInput,
  CreateAdmissionNoteInput,
  SignAdmissionNoteInput,
  AddAdmissionNoteAddendumInput,
  CreateShiftHandoverInput,
  AcknowledgeShiftHandoverInput,
  CreateIpdMedicationOrderInput,
  HoldIpdMedicationOrderInput,
  StopIpdMedicationOrderInput,
  AdministerMedicationInput,
  RecordPrnAdministrationInput,
} from './dto/nursing.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { EntitlementGuard, RequiresFeature } from '../entitlements/entitlement.guard';
import { IPD_FEATURE_KEY } from '../wards/ipd-feature.constant';

// REQ179 (IPD slice 2) — ward charting. Auth mirrors wards.resolver.ts: staff
// and clinician can both chart (a nurse is a `staff` account in this schema's
// role model — there is no separate "nurse" role) and manager+ inherit
// everything. Reads ungated on the entitlement flag, matching every other
// IPD resolver's own stated reasoning (an empty chart is harmless; a blocked
// read is a confusing 403 mid-upgrade); every mutation carries
// @RequiresFeature('ipd').
const CHART_ROLES = ['staff', 'clinician', 'manager', 'admin', 'super_admin'] as const;

@Resolver()
export class NursingResolver {
  constructor(
    private readonly nursingService: NursingService,
    private readonly medicationOrdersService: MedicationOrdersService,
    private readonly marService: MarService,
  ) {}

  // ── Vitals ────────────────────────────────────────────────────────────

  @Auth(...CHART_ROLES)
  @Query(() => [VitalType])
  admissionVitals(@Args('admission_id', { type: () => ID }) admissionId: string, @CurrentUser() user: JwtPayload) {
    return this.nursingService.admissionVitals(admissionId, user);
  }

  @Auth(...CHART_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => [VitalType])
  recordAdmissionVitals(@Args('input') input: RecordAdmissionVitalsInput, @CurrentUser() user: JwtPayload) {
    return this.nursingService.recordAdmissionVitals(input, user);
  }

  // ── Intake / output ───────────────────────────────────────────────────

  @Auth(...CHART_ROLES)
  @Query(() => [IntakeOutputRecordType])
  intakeOutputRecords(@Args('admission_id', { type: () => ID }) admissionId: string, @CurrentUser() user: JwtPayload) {
    return this.nursingService.intakeOutputRecords(admissionId, user);
  }

  @Auth(...CHART_ROLES)
  @Query(() => IntakeOutputBalanceType)
  intakeOutputBalance(
    @Args('admission_id', { type: () => ID }) admissionId: string,
    @Args('window_hours', { type: () => Int, nullable: true }) windowHours: number | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.nursingService.intakeOutputBalance(admissionId, windowHours ?? 24, user);
  }

  @Auth(...CHART_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IntakeOutputRecordType)
  recordIntakeOutput(@Args('input') input: RecordIntakeOutputInput, @CurrentUser() user: JwtPayload) {
    return this.nursingService.recordIntakeOutput(input, user);
  }

  // ── Admission notes ───────────────────────────────────────────────────

  @Auth(...CHART_ROLES)
  @Query(() => [AdmissionNoteType])
  admissionNotes(
    @Args('admission_id', { type: () => ID }) admissionId: string,
    @Args('note_kind', { type: () => String, nullable: true }) noteKind: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.nursingService.admissionNotes(admissionId, noteKind, user);
  }

  @Auth(...CHART_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => AdmissionNoteType)
  createAdmissionNote(@Args('input') input: CreateAdmissionNoteInput, @CurrentUser() user: JwtPayload) {
    return this.nursingService.createAdmissionNote(input, user);
  }

  @Auth(...CHART_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => AdmissionNoteType)
  signAdmissionNote(@Args('input') input: SignAdmissionNoteInput, @CurrentUser() user: JwtPayload) {
    return this.nursingService.signAdmissionNote(input, user);
  }

  @Auth(...CHART_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => AdmissionNoteType)
  addAdmissionNoteAddendum(@Args('input') input: AddAdmissionNoteAddendumInput, @CurrentUser() user: JwtPayload) {
    return this.nursingService.addAdmissionNoteAddendum(input, user);
  }

  // ── Shift handover ────────────────────────────────────────────────────

  @Auth(...CHART_ROLES)
  @Query(() => [ShiftHandoverType])
  admissionHandovers(@Args('admission_id', { type: () => ID }) admissionId: string, @CurrentUser() user: JwtPayload) {
    return this.nursingService.admissionHandovers(admissionId, user);
  }

  @Auth(...CHART_ROLES)
  @Query(() => [ShiftHandoverType])
  wardHandovers(@Args('ward_id', { type: () => ID }) wardId: string, @CurrentUser() user: JwtPayload) {
    return this.nursingService.wardHandovers(wardId, user);
  }

  @Auth(...CHART_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => ShiftHandoverType)
  createShiftHandover(@Args('input') input: CreateShiftHandoverInput, @CurrentUser() user: JwtPayload) {
    return this.nursingService.createShiftHandover(input, user);
  }

  @Auth(...CHART_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => ShiftHandoverType)
  acknowledgeShiftHandover(@Args('input') input: AcknowledgeShiftHandoverInput, @CurrentUser() user: JwtPayload) {
    return this.nursingService.acknowledgeShiftHandover(input, user);
  }

  // ── Medication orders ─────────────────────────────────────────────────

  @Auth(...CHART_ROLES)
  @Query(() => [IpdMedicationOrderType])
  admissionMedicationOrders(
    @Args('admission_id', { type: () => ID }) admissionId: string,
    @Args('active_only', { type: () => Boolean, nullable: true }) activeOnly: boolean | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.medicationOrdersService.findAllForAdmission(admissionId, activeOnly ?? false, user);
  }

  @Auth(...CHART_ROLES)
  @Query(() => IpdMedicationOrderType, { nullable: true })
  ipdMedicationOrder(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.medicationOrdersService.findOne(id, user);
  }

  // Ordering is a clinician-only action in practice (assertClinician_id in
  // the service) but gated at the same role tier as the rest of this
  // resolver — the service's own user.clinician_id check is the real gate.
  @Auth(...CHART_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdMedicationOrderType)
  createIpdMedicationOrder(@Args('input') input: CreateIpdMedicationOrderInput, @CurrentUser() user: JwtPayload) {
    return this.medicationOrdersService.create(input, user);
  }

  @Auth(...CHART_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdMedicationOrderType)
  holdIpdMedicationOrder(@Args('input') input: HoldIpdMedicationOrderInput, @CurrentUser() user: JwtPayload) {
    return this.medicationOrdersService.hold(input, user);
  }

  @Auth(...CHART_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdMedicationOrderType)
  resumeIpdMedicationOrder(@Args('order_id', { type: () => ID }) orderId: string, @CurrentUser() user: JwtPayload) {
    return this.medicationOrdersService.resume(orderId, user);
  }

  @Auth(...CHART_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => IpdMedicationOrderType)
  stopIpdMedicationOrder(@Args('input') input: StopIpdMedicationOrderInput, @CurrentUser() user: JwtPayload) {
    return this.medicationOrdersService.stop(input, user);
  }

  // ── MAR ───────────────────────────────────────────────────────────────

  @Auth(...CHART_ROLES)
  @Query(() => [MedicationAdministrationType])
  admissionMar(
    @Args('admission_id', { type: () => ID }) admissionId: string,
    @Args('from', { type: () => String, nullable: true }) from: string | undefined,
    @Args('to', { type: () => String, nullable: true }) to: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.marService.admissionMar(admissionId, from, to, user);
  }

  @Auth(...CHART_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => MedicationAdministrationType)
  administerMedication(@Args('input') input: AdministerMedicationInput, @CurrentUser() user: JwtPayload) {
    return this.marService.administer(input, user);
  }

  @Auth(...CHART_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(IPD_FEATURE_KEY)
  @Mutation(() => MedicationAdministrationType)
  recordPrnAdministration(@Args('input') input: RecordPrnAdministrationInput, @CurrentUser() user: JwtPayload) {
    return this.marService.recordPrn(input, user);
  }
}
