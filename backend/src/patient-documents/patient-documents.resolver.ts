import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { PatientDocumentsService } from './patient-documents.service';
import { PatientDocumentType } from './entities/patient-document.entity';
import { CreatePatientDocumentInput } from './dto/patient-document.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => PatientDocumentType)
export class PatientDocumentsResolver {
  constructor(private readonly patientDocumentsService: PatientDocumentsService) {}

  // Read matches the full audience that already sees the rest of
  // patients/detail.jsx's other tabs.
  @Auth('admin', 'manager', 'super_admin', 'clinician', 'staff')
  @Query(() => [PatientDocumentType])
  patientDocuments(@Args('patient_id', { type: () => ID }) patientId: string, @CurrentUser() user: JwtPayload) {
    return this.patientDocumentsService.findAll(patientId, user);
  }

  // REQ174 — write access deliberately narrower than read: admin/manager/
  // clinician only, per the requirement's own explicit role list (excludes
  // 'staff').
  @Auth('admin', 'manager', 'clinician')
  @Mutation(() => PatientDocumentType)
  createPatientDocument(@Args('input') input: CreatePatientDocumentInput, @CurrentUser() user: JwtPayload) {
    return this.patientDocumentsService.create(input, user);
  }

  // Narrower still — removing a compliance-relevant medical record
  // deserves a slightly higher bar than uploading one.
  @Auth('admin', 'manager')
  @Mutation(() => Boolean)
  deletePatientDocument(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.patientDocumentsService.remove(id, user);
  }
}
