import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { EncountersService } from './encounters.service';
import {
  EncounterType,
  EncounterNoteType,
  EncounterAddendumType,
  DiagnosisType,
  AttachmentType,
  EncounterTemplateType,
  TimelineEventType,
  InvestigationOrderType,
  ReferralType,
  VitalType,
} from './entities/encounter.entity';
import {
  SaveEncounterNoteInput,
  AddAddendumInput,
  CreateDiagnosisInput,
  OrderInvestigationInput,
  CreateReferralInput,
  RecordVitalsInput,
  CreateEncounterTemplateInput,
  ApplyTemplateInput,
  CreateAttachmentInput,
} from './dto/encounter.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ020 (Phase 1, slice 2) P0 -- consultation workspace / clinical records.
// Deliberately not @Auth('patient') on any write path here: a patient may
// read their own timeline/allergy banner, but every note/diagnosis/sign-off
// mutation is clinician-only (front-desk staff/admin never author clinical
// content, matching the requirement's own role list).
@Resolver(() => EncounterType)
export class EncountersResolver {
  constructor(private readonly encountersService: EncountersService) {}

  @Auth('clinician', 'manager', 'admin', 'super_admin', 'staff')
  @Query(() => EncounterType, { nullable: true })
  encounter(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.encountersService.encounter(id, user);
  }

  @Auth('clinician', 'manager', 'admin', 'super_admin', 'staff')
  @Query(() => [EncounterType])
  encounters(@CurrentUser() user: JwtPayload) {
    return this.encountersService.findAll(user);
  }

  @Auth('clinician', 'manager', 'admin', 'super_admin', 'staff')
  @Mutation(() => EncounterType)
  getOrCreateEncounter(@Args('appointment_id', { type: () => ID }) appointmentId: string, @CurrentUser() user: JwtPayload) {
    return this.encountersService.getOrCreateEncounter(appointmentId, user);
  }

  @Auth('clinician')
  @Mutation(() => EncounterNoteType)
  saveEncounterNote(@Args('input') input: SaveEncounterNoteInput, @CurrentUser() user: JwtPayload) {
    return this.encountersService.saveEncounterNote(input, user);
  }

  @Auth('clinician')
  @Mutation(() => EncounterType)
  signEncounter(@Args('encounter_id', { type: () => ID }) encounterId: string, @CurrentUser() user: JwtPayload) {
    return this.encountersService.signEncounter(encounterId, user);
  }

  @Auth('clinician')
  @Mutation(() => EncounterAddendumType)
  addEncounterAddendum(@Args('input') input: AddAddendumInput, @CurrentUser() user: JwtPayload) {
    return this.encountersService.addAddendum(input, user);
  }

  @Auth('clinician')
  @Mutation(() => DiagnosisType)
  createDiagnosis(@Args('input') input: CreateDiagnosisInput, @CurrentUser() user: JwtPayload) {
    return this.encountersService.createDiagnosis(input, user);
  }

  // REQ127 (FR-EMR-08)
  @Auth('clinician')
  @Mutation(() => InvestigationOrderType)
  orderInvestigation(@Args('input') input: OrderInvestigationInput, @CurrentUser() user: JwtPayload) {
    return this.encountersService.orderInvestigation(input, user);
  }

  // REQ128 (FR-EMR-10)
  @Auth('clinician')
  @Mutation(() => ReferralType)
  createReferral(@Args('input') input: CreateReferralInput, @CurrentUser() user: JwtPayload) {
    return this.encountersService.createReferral(input, user);
  }

  // REQ130 (FR-EMR-05)
  @Auth('clinician')
  @Mutation(() => [VitalType])
  recordVitals(@Args('input') input: RecordVitalsInput, @CurrentUser() user: JwtPayload) {
    return this.encountersService.recordVitals(input, user);
  }

  // REQ130 (FR-EMR-05) — the growth-chart query. Same @Auth gate as
  // patientAllergyBanner/patientTimeline below (a patient may read their
  // own trend).
  @Auth('patient', 'clinician', 'manager', 'admin', 'super_admin', 'staff')
  @Query(() => [VitalType])
  patientVitals(
    @Args('patient_id', { type: () => ID }) patientId: string,
    @Args('code') code: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.encountersService.patientVitals(patientId, code, user);
  }

  @Auth('patient', 'clinician', 'manager', 'admin', 'super_admin', 'staff')
  @Query(() => [DiagnosisType])
  patientAllergyBanner(@Args('patient_id', { type: () => ID }) patientId: string, @CurrentUser() user: JwtPayload) {
    return this.encountersService.patientAllergyBanner(patientId, user);
  }

  @Auth('clinician', 'manager', 'admin', 'super_admin')
  @Query(() => [EncounterTemplateType])
  encounterTemplates(
    @Args('specialty', { nullable: true }) specialty: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.encountersService.encounterTemplates(specialty, user);
  }

  @Auth('clinician', 'manager', 'admin', 'super_admin')
  @Mutation(() => EncounterTemplateType)
  createEncounterTemplate(@Args('input') input: CreateEncounterTemplateInput, @CurrentUser() user: JwtPayload) {
    return this.encountersService.createEncounterTemplate(input, user);
  }

  @Auth('clinician')
  @Mutation(() => EncounterType)
  applyEncounterTemplate(@Args('input') input: ApplyTemplateInput, @CurrentUser() user: JwtPayload) {
    return this.encountersService.applyTemplate(input, user);
  }

  // Metadata-persist half of the two-step upload pattern (REST controller
  // returns file_ref, this mutation persists it) -- see
  // encounters/attachments.controller.ts.
  @Auth('clinician')
  @Mutation(() => AttachmentType)
  createEncounterAttachment(@Args('input') input: CreateAttachmentInput, @CurrentUser() user: JwtPayload) {
    return this.encountersService.createAttachment(input, user);
  }

  @Auth('patient', 'clinician', 'manager', 'admin', 'super_admin', 'staff')
  @Query(() => [TimelineEventType])
  patientTimeline(@Args('patient_id', { type: () => ID }) patientId: string, @CurrentUser() user: JwtPayload) {
    return this.encountersService.patientTimeline(patientId, user);
  }
}
