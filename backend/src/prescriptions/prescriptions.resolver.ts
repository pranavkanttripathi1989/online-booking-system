import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { PrescriptionsService } from './prescriptions.service';
import {
  PrescriptionType,
  PrescriptionItemType,
  PrescriptionDraftType,
  PrescriptionSetType,
  PrescriptionPrintPayloadType,
  SharePrescriptionResultType,
} from './entities/prescription.entity';
import { CreatePrescriptionInput, CreatePrescriptionSetInput } from './dto/prescription.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ021 (Phase 1, slice 3) P0. Deliberately no @Auth('patient') on any
// write path -- a patient may read their own prescriptions, but issuing one
// is clinician-only (matches encounters.resolver.ts's identical convention).
@Resolver(() => PrescriptionType)
export class PrescriptionsResolver {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Auth('patient', 'clinician', 'manager', 'admin', 'super_admin', 'staff')
  @Query(() => PrescriptionType, { nullable: true })
  prescription(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.prescriptionsService.prescription(id, user);
  }

  @Auth('clinician', 'manager', 'admin', 'super_admin', 'staff')
  @Query(() => [PrescriptionType])
  prescriptions(@CurrentUser() user: JwtPayload) {
    return this.prescriptionsService.findAll(user);
  }

  @Auth('patient', 'clinician', 'manager', 'admin', 'super_admin', 'staff')
  @Query(() => [PrescriptionType])
  patientPrescriptions(@Args('patient_id', { type: () => ID }) patientId: string, @CurrentUser() user: JwtPayload) {
    return this.prescriptionsService.patientPrescriptions(patientId, user);
  }

  @Auth('clinician')
  @Mutation(() => PrescriptionType)
  createPrescription(@Args('input') input: CreatePrescriptionInput, @CurrentUser() user: JwtPayload) {
    return this.prescriptionsService.createPrescription(input, user);
  }

  @Auth('clinician')
  @Query(() => PrescriptionDraftType)
  repeatPrescription(@Args('source_id', { type: () => ID }) sourceId: string, @CurrentUser() user: JwtPayload) {
    return this.prescriptionsService.repeatPrescription(sourceId, user);
  }

  @Auth('patient', 'clinician', 'manager', 'admin', 'super_admin', 'staff')
  @Query(() => PrescriptionPrintPayloadType)
  printPrescription(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.prescriptionsService.printPrescription(id, user);
  }

  // REQ109 — same @Auth gate as printPrescription above (its own access
  // control, loadPrescriptionForUser, is identical to this method's).
  @Auth('patient', 'clinician', 'manager', 'admin', 'super_admin', 'staff')
  @Mutation(() => SharePrescriptionResultType)
  sharePrescriptionViaWhatsapp(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.prescriptionsService.sharePrescriptionViaWhatsapp(id, user);
  }

  @Auth('clinician', 'manager', 'admin', 'super_admin')
  @Query(() => [PrescriptionSetType])
  prescriptionSets(@Args('specialty', { nullable: true }) specialty: string, @CurrentUser() user: JwtPayload) {
    return this.prescriptionsService.prescriptionSets(specialty, user);
  }

  @Auth('clinician', 'manager', 'admin', 'super_admin')
  @Mutation(() => PrescriptionSetType)
  createPrescriptionSet(@Args('input') input: CreatePrescriptionSetInput, @CurrentUser() user: JwtPayload) {
    return this.prescriptionsService.createPrescriptionSet(input, user);
  }

  @Auth('clinician')
  @Query(() => [PrescriptionItemType])
  applyPrescriptionSet(@Args('set_id', { type: () => ID }) setId: string, @CurrentUser() user: JwtPayload) {
    return this.prescriptionsService.applyPrescriptionSet(setId, user);
  }
}
