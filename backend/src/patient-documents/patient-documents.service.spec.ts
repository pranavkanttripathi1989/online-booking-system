import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PatientDocumentsService } from './patient-documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ174 — makes patients/detail.jsx's own pre-existing (fake, local-
// state-only) Documents tab real. Access checks are deliberately delegated
// to PatientsService.findOne() rather than re-derived here (Hard Rule 7) —
// these tests confirm that delegation actually happens and its result is
// respected, not PatientsService's own scoping logic a second time (that's
// already covered in patients.service.spec.ts).
describe('PatientDocumentsService (REQ174)', () => {
  let service: PatientDocumentsService;
  let prisma: {
    patientDocuments: { findMany: jest.Mock; create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  };
  let patientsService: { findOne: jest.Mock };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a' } as JwtPayload;
  const clinicianUser: JwtPayload = { sub: 'u2', roles: ['clinician'], client_org_id: 'org-a', clinician_id: 'clin-a' } as JwtPayload;
  const staffUser: JwtPayload = { sub: 'u3', roles: ['staff'], client_org_id: 'org-a' } as JwtPayload;

  const docRow = {
    id: 'doc-1',
    patient_id: 'pat-1',
    client_org_id: 'org-a',
    category: 'Lab Reports',
    file_ref: '/uploads/patient-documents/x.pdf',
    mime_type: 'application/pdf',
    original_filename: 'report.pdf',
    file_size_bytes: 1234,
    uploaded_by_id: 'u1',
    is_deleted: false,
  };

  beforeEach(async () => {
    prisma = {
      patientDocuments: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    patientsService = { findOne: jest.fn().mockResolvedValue({ id: 'pat-1' }) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientDocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PatientsService, useValue: patientsService },
      ],
    }).compile();
    service = module.get(PatientDocumentsService);
  });

  describe('findAll', () => {
    it('checks patient access via PatientsService.findOne before listing', async () => {
      await service.findAll('pat-1', orgAUser);
      expect(patientsService.findOne).toHaveBeenCalledWith('pat-1', orgAUser);
      expect(prisma.patientDocuments.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { patient_id: 'pat-1', is_deleted: false } }),
      );
    });

    it('propagates a NotFoundException from PatientsService.findOne (no independent access path)', async () => {
      patientsService.findOne.mockRejectedValue(new NotFoundException('Patient not found'));
      await expect(service.findAll('pat-1', clinicianUser)).rejects.toThrow(NotFoundException);
      expect(prisma.patientDocuments.findMany).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('checks patient access before creating, and stamps the caller\'s own org', async () => {
      prisma.patientDocuments.create.mockResolvedValue(docRow);
      await service.create(
        { patient_id: 'pat-1', category: 'Lab Reports', file_ref: '/x.pdf', mime_type: 'application/pdf', original_filename: 'report.pdf', file_size_bytes: 1234 },
        orgAUser,
      );
      expect(patientsService.findOne).toHaveBeenCalledWith('pat-1', orgAUser);
      expect(prisma.patientDocuments.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-a', uploaded_by_id: 'u1' }) }),
      );
    });

    it('rejects when the caller has no access to the target patient (e.g. a clinician who never treated them)', async () => {
      patientsService.findOne.mockRejectedValue(new NotFoundException('Patient not found'));
      await expect(
        service.create(
          { patient_id: 'pat-1', category: 'Lab Reports', file_ref: '/x.pdf', mime_type: 'application/pdf', original_filename: 'report.pdf', file_size_bytes: 1234 },
          clinicianUser,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.patientDocuments.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('soft-deletes rather than hard-deleting', async () => {
      prisma.patientDocuments.findUnique.mockResolvedValue(docRow);
      prisma.patientDocuments.update.mockResolvedValue({ ...docRow, is_deleted: true });
      await service.remove('doc-1', orgAUser);
      expect(prisma.patientDocuments.update).toHaveBeenCalledWith({ where: { id: 'doc-1' }, data: { is_deleted: true } });
    });

    it('rejects removing an already-deleted (or nonexistent) document', async () => {
      prisma.patientDocuments.findUnique.mockResolvedValue({ ...docRow, is_deleted: true });
      await expect(service.remove('doc-1', orgAUser)).rejects.toThrow(NotFoundException);
      expect(prisma.patientDocuments.update).not.toHaveBeenCalled();
    });

    it('re-checks patient access before deleting (a staff-only caller with no delete role never even reaches this — checked at the resolver @Auth layer, but the service itself still re-validates patient visibility)', async () => {
      prisma.patientDocuments.findUnique.mockResolvedValue(docRow);
      patientsService.findOne.mockRejectedValue(new NotFoundException('Patient not found'));
      await expect(service.remove('doc-1', staffUser)).rejects.toThrow(NotFoundException);
      expect(prisma.patientDocuments.update).not.toHaveBeenCalled();
    });
  });
});
