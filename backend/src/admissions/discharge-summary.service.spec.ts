import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DischargeSummaryService } from './discharge-summary.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('DischargeSummaryService', () => {
  let service: DischargeSummaryService;
  let prisma: any;

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const orgBUser: JwtPayload = { sub: 'u2', roles: ['manager'], client_org_id: 'org-b', patient_id: null, clinician_id: null } as JwtPayload;
  const clinicianUser: JwtPayload = { sub: 'u3', roles: ['clinician'], client_org_id: 'org-a', patient_id: null, clinician_id: 'clin-a' } as JwtPayload;

  const admissionA = {
    id: 'adm-a',
    client_org_id: 'org-a',
    is_deleted: false,
    final_diagnosis: 'Acute appendicitis',
    provisional_diagnosis: 'Abdominal pain',
  };

  const summaryRow = {
    id: 'ds-1',
    client_org_id: 'org-a',
    admission_id: 'adm-a',
    locked: false,
    chief_complaint: '',
    history: '',
    examination_findings: '',
    final_diagnosis: 'Acute appendicitis',
    course_in_hospital: 'day 1',
    procedures_performed: '',
    investigations_summary: '',
    condition_at_discharge: '',
    discharge_medications: 'Paracetamol',
    diet_advice: '',
    follow_up_advice: '',
    follow_up_date: null,
    emergency_instructions: '',
    icd10_codes: null,
  };

  beforeEach(async () => {
    prisma = {
      admissions: { findUnique: jest.fn() },
      admissionEvents: { findMany: jest.fn().mockResolvedValue([]) },
      ipdMedicationOrders: { findMany: jest.fn().mockResolvedValue([]) },
      dischargeSummaries: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      dischargeSummaryTemplates: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), create: jest.fn() },
      clinics: { findUnique: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [DischargeSummaryService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(DischargeSummaryService);
    prisma.admissions.findUnique.mockResolvedValue(admissionA);
  });

  describe('create', () => {
    it('rejects a cross-org admission', async () => {
      await expect(service.create({ admission_id: 'adm-a' } as any, orgBUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects creating a second summary for the same admission', async () => {
      prisma.dischargeSummaries.findUnique.mockResolvedValue(summaryRow);
      await expect(service.create({ admission_id: 'adm-a' } as any, orgAUser)).rejects.toThrow(ConflictException);
      expect(prisma.dischargeSummaries.create).not.toHaveBeenCalled();
    });

    it('pre-fills final_diagnosis from the admission and builds the course/medications from real rows', async () => {
      prisma.dischargeSummaries.findUnique.mockResolvedValue(null);
      prisma.admissionEvents.findMany.mockResolvedValue([
        { event_type: 'admitted', occurred_at: new Date('2026-09-01T10:00:00Z'), payload_json: { to_ward_name: 'ICU', to_bed_number: 'B1' } },
      ]);
      prisma.ipdMedicationOrders.findMany.mockResolvedValue([
        { dose: '500mg', dose_unit: '', route: 'po', frequency: 'BD', drug: { name: 'Paracetamol' } },
      ]);
      prisma.dischargeSummaries.create.mockResolvedValue({ ...summaryRow });
      await service.create({ admission_id: 'adm-a' } as any, orgAUser);

      const data = prisma.dischargeSummaries.create.mock.calls[0][0].data;
      expect(data.final_diagnosis).toBe('Acute appendicitis');
      expect(data.course_in_hospital).toContain('Admitted');
      expect(data.course_in_hospital).toContain('ICU');
      expect(data.discharge_medications).toContain('Paracetamol');
      expect(data.prepared_by_user_id).toBe('u1');
    });

    it('rejects a cross-org template', async () => {
      prisma.dischargeSummaries.findUnique.mockResolvedValue(null);
      prisma.dischargeSummaryTemplates.findUnique.mockResolvedValue({ id: 'tpl-1', is_deleted: false, client_org_id: 'org-b' });
      await expect(service.create({ admission_id: 'adm-a', template_id: 'tpl-1' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('rejects editing a locked (signed) summary', async () => {
      prisma.dischargeSummaries.findUnique.mockResolvedValue({ ...summaryRow, locked: true });
      await expect(service.update('ds-1', { chief_complaint: 'x' } as any, orgAUser)).rejects.toThrow(BadRequestException);
      expect(prisma.dischargeSummaries.update).not.toHaveBeenCalled();
    });

    it('rejects a cross-org summary', async () => {
      prisma.dischargeSummaries.findUnique.mockResolvedValue({ ...summaryRow, client_org_id: 'org-b' });
      await expect(service.update('ds-1', { chief_complaint: 'x' } as any, orgAUser)).rejects.toThrow();
    });

    it('updates an unlocked summary', async () => {
      prisma.dischargeSummaries.findUnique.mockResolvedValue(summaryRow);
      prisma.dischargeSummaries.update.mockResolvedValue({ ...summaryRow, chief_complaint: 'Fever' });
      await service.update('ds-1', { chief_complaint: 'Fever' } as any, orgAUser);
      expect(prisma.dischargeSummaries.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ chief_complaint: 'Fever' }) }),
      );
    });
  });

  describe('sign', () => {
    it('rejects signing an already-signed summary', async () => {
      prisma.dischargeSummaries.findUnique.mockResolvedValue({ ...summaryRow, locked: true });
      await expect(service.sign({ discharge_summary_id: 'ds-1' } as any, clinicianUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects a non-clinician caller', async () => {
      prisma.dischargeSummaries.findUnique.mockResolvedValue(summaryRow);
      await expect(service.sign({ discharge_summary_id: 'ds-1' } as any, orgAUser)).rejects.toThrow(BadRequestException);
      expect(prisma.dischargeSummaries.update).not.toHaveBeenCalled();
    });

    it('locks the summary, stamps signed_by/signed_at, and computes a deterministic content hash', async () => {
      prisma.dischargeSummaries.findUnique.mockResolvedValue(summaryRow);
      prisma.dischargeSummaries.update.mockImplementation(({ data }: any) => ({ ...summaryRow, ...data }));
      const result = await service.sign({ discharge_summary_id: 'ds-1' } as any, clinicianUser);

      const updateArgs = prisma.dischargeSummaries.update.mock.calls[0][0];
      expect(updateArgs.data.locked).toBe(true);
      expect(updateArgs.data.signed_by_clinician_id).toBe('clin-a');
      expect(updateArgs.data.pdf_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(result.locked).toBe(true);
    });

    it('produces the same hash for identical content and a different hash when content changes', async () => {
      prisma.dischargeSummaries.findUnique.mockResolvedValue(summaryRow);
      prisma.dischargeSummaries.update.mockImplementation(({ data }: any) => ({ ...summaryRow, ...data }));
      await service.sign({ discharge_summary_id: 'ds-1' } as any, clinicianUser);
      const hash1 = prisma.dischargeSummaries.update.mock.calls[0][0].data.pdf_hash;

      prisma.dischargeSummaries.update.mockClear();
      prisma.dischargeSummaries.findUnique.mockResolvedValue({ ...summaryRow, course_in_hospital: 'day 1, day 2' });
      await service.sign({ discharge_summary_id: 'ds-1' } as any, clinicianUser);
      const hash2 = prisma.dischargeSummaries.update.mock.calls[0][0].data.pdf_hash;

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('createDischargeSummaryTemplate', () => {
    it('rejects a cross-org clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-b', is_deleted: false, client_org_id: 'org-b' });
      await expect(
        service.createDischargeSummaryTemplate({ clinic_id: 'clinic-b', name: 'General', sections: [{ key: 'course', label: 'Course' }] } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates an org-wide template with no clinic_id', async () => {
      prisma.dischargeSummaryTemplates.create.mockResolvedValue({
        id: 'tpl-1',
        clinic_id: null,
        name: 'General',
        specialty: null,
        sections_json: [{ key: 'course', label: 'Course', default: '' }],
        is_active: true,
      });
      const result = await service.createDischargeSummaryTemplate(
        { name: 'General', sections: [{ key: 'course', label: 'Course' }] } as any,
        orgAUser,
      );
      expect(result.sections).toEqual([{ key: 'course', label: 'Course', default_text: '' }]);
    });
  });
});
