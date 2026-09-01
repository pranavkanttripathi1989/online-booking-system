import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { CreatePatientDocumentInput } from './dto/patient-document.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgIdForWrite } from '../common/scoping/tenant-scope';

// REQ174 — makes patients/detail.jsx's own pre-existing (fake, local-
// state-only) Documents tab real.
@Injectable()
export class PatientDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientsService: PatientsService,
  ) {}

  // Reuses PatientsService.findOne()'s own org + self/relationship-scope
  // check (org staff vs. a clinician who has actually treated this
  // patient vs. the patient/dependant themselves) rather than re-deriving
  // patient access a third time (Hard Rule 7) — it throws NotFoundException
  // itself when the caller may not see this patient at all.
  async findAll(patientId: string, user: JwtPayload) {
    await this.patientsService.findOne(patientId, user);
    return this.prisma.patientDocuments.findMany({
      where: { patient_id: patientId, is_deleted: false },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(input: CreatePatientDocumentInput, user: JwtPayload) {
    await this.patientsService.findOne(input.patient_id, user);
    return this.prisma.patientDocuments.create({
      data: {
        patient_id: input.patient_id,
        client_org_id: orgIdForWrite(user, 'patient document'),
        category: input.category,
        file_ref: input.file_ref,
        mime_type: input.mime_type,
        original_filename: input.original_filename,
        file_size_bytes: input.file_size_bytes,
        uploaded_by_id: user.sub,
      },
    });
  }

  async remove(id: string, user: JwtPayload) {
    const existing = await this.prisma.patientDocuments.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) throw new NotFoundException('Document not found');
    // Same access check as reading/creating — a caller who cannot see this
    // patient at all cannot delete a document attached to them either.
    await this.patientsService.findOne(existing.patient_id, user);
    await this.prisma.patientDocuments.update({ where: { id }, data: { is_deleted: true } });
    return true;
  }
}
