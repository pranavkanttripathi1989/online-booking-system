import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ChronicRegistriesService, computeRecallStatus } from './chronic-registries.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('computeRecallStatus (pure)', () => {
  const now = new Date('2026-08-30T00:00:00.000Z');

  it('returns overdue when the 90-day interval has passed', () => {
    expect(computeRecallStatus(new Date('2026-01-01'), now)).toBe('overdue');
  });
  it('returns due_soon when due within the next 30 days', () => {
    expect(computeRecallStatus(new Date('2026-06-15'), now)).toBe('due_soon');
  });
  it('returns upcoming when due more than 30 days away', () => {
    expect(computeRecallStatus(new Date('2026-08-01'), now)).toBe('upcoming');
  });
});

describe('ChronicRegistriesService — access scoping', () => {
  let service: ChronicRegistriesService;
  let prisma: {
    diagnoses: { findMany: jest.Mock };
    chronicRegistryEnrollments: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    patients: { findUnique: jest.Mock };
  };

  const staffUser: JwtPayload = { sub: 'staff-1', roles: ['manager'], client_org_id: 'org-1' } as JwtPayload;
  const platformAdmin: JwtPayload = { sub: 'admin-1', roles: ['admin'], client_org_id: null } as JwtPayload;

  beforeEach(async () => {
    prisma = {
      diagnoses: { findMany: jest.fn().mockResolvedValue([]) },
      chronicRegistryEnrollments: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      patients: { findUnique: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChronicRegistriesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ChronicRegistriesService);
  });

  describe('chronicRegistrySuggestions', () => {
    it('scopes the diagnosis scan to the caller\'s own org', async () => {
      await service.chronicRegistrySuggestions('diabetes', staffUser);
      const where = prisma.diagnoses.findMany.mock.calls[0][0].where;
      expect(where.encounter).toEqual({ client_org_id: 'org-1' });
    });

    it('matches on the condition\'s known ICD-10 prefixes', async () => {
      await service.chronicRegistrySuggestions('hypertension', staffUser);
      const where = prisma.diagnoses.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { icd10_code: { startsWith: 'I10' } },
        { icd10_code: { startsWith: 'I11' } },
        { icd10_code: { startsWith: 'I12' } },
        { icd10_code: { startsWith: 'I13' } },
        { icd10_code: { startsWith: 'I15' } },
      ]);
    });

    it('excludes a patient already enrolled for that condition', async () => {
      prisma.diagnoses.findMany.mockResolvedValue([
        { icd10_code: 'E11.9', text: 'Type 2 Diabetes', encounter: { patient_id: 'pat-1', patient: { first_name: 'A', last_name: 'B' } } },
      ]);
      prisma.chronicRegistryEnrollments.findMany.mockResolvedValue([{ patient_id: 'pat-1' }]);
      const result = await service.chronicRegistrySuggestions('diabetes', staffUser);
      expect(result).toHaveLength(0);
    });

    it('returns a candidate not yet enrolled, deduplicated across multiple matching diagnoses', async () => {
      prisma.diagnoses.findMany.mockResolvedValue([
        { icd10_code: 'E11.9', text: 'Type 2 Diabetes', encounter: { patient_id: 'pat-2', patient: { first_name: 'Anita', last_name: 'Sharma' } } },
        { icd10_code: 'E11.2', text: 'Diabetic nephropathy', encounter: { patient_id: 'pat-2', patient: { first_name: 'Anita', last_name: 'Sharma' } } },
      ]);
      prisma.chronicRegistryEnrollments.findMany.mockResolvedValue([]);
      const result = await service.chronicRegistrySuggestions('diabetes', staffUser);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({ patient_id: 'pat-2', patient_name: 'Anita Sharma', matched_icd10_code: 'E11.9' }));
    });
  });

  describe('registryEnrollments', () => {
    it('a platform operator sees every org\'s enrollments (no filter)', async () => {
      await service.registryEnrollments(undefined, platformAdmin);
      const where = prisma.chronicRegistryEnrollments.findMany.mock.calls[0][0].where;
      expect(where.patient).toBeUndefined();
    });

    it('an org-scoped caller is restricted to their own org', async () => {
      await service.registryEnrollments(undefined, staffUser);
      const where = prisma.chronicRegistryEnrollments.findMany.mock.calls[0][0].where;
      expect(where.patient).toEqual({ client_org_id: 'org-1' });
    });
  });

  describe('enrollInRegistry', () => {
    const validInput = { patient_id: 'pat-1', condition: 'diabetes' };

    it('rejects an unknown patient', async () => {
      prisma.patients.findUnique.mockResolvedValue(null);
      await expect(service.enrollInRegistry(validInput as any, staffUser)).rejects.toThrow(BadRequestException);
      expect(prisma.chronicRegistryEnrollments.create).not.toHaveBeenCalled();
    });

    it('rejects a patient belonging to a different org (Hard Rule 6)', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', is_deleted: false, client_org_id: 'org-2' });
      await expect(service.enrollInRegistry(validInput as any, staffUser)).rejects.toThrow(NotFoundException);
      expect(prisma.chronicRegistryEnrollments.create).not.toHaveBeenCalled();
    });

    it('rejects enrolling a patient already actively enrolled for the same condition', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', is_deleted: false, client_org_id: 'org-1' });
      prisma.chronicRegistryEnrollments.findUnique.mockResolvedValue({ id: 'enr-1', status: 'active', is_deleted: false });
      await expect(service.enrollInRegistry(validInput as any, staffUser)).rejects.toThrow(BadRequestException);
      expect(prisma.chronicRegistryEnrollments.create).not.toHaveBeenCalled();
    });

    it('reactivates a previously resolved enrollment instead of creating a duplicate row', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', is_deleted: false, client_org_id: 'org-1' });
      prisma.chronicRegistryEnrollments.findUnique.mockResolvedValue({ id: 'enr-1', status: 'resolved', is_deleted: false });
      prisma.chronicRegistryEnrollments.update.mockResolvedValue({
        id: 'enr-1', patient_id: 'pat-1', condition: 'diabetes', status: 'active', enrolled_at: new Date(), last_reviewed_at: new Date(),
        patient: { first_name: 'A', last_name: 'B' }, enrolledBy: null,
      });
      await service.enrollInRegistry(validInput as any, staffUser);
      expect(prisma.chronicRegistryEnrollments.create).not.toHaveBeenCalled();
      expect(prisma.chronicRegistryEnrollments.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'enr-1' }, data: expect.objectContaining({ status: 'active' }) }),
      );
    });

    it('creates a new enrollment for a never-enrolled patient', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', is_deleted: false, client_org_id: 'org-1' });
      prisma.chronicRegistryEnrollments.findUnique.mockResolvedValue(null);
      prisma.chronicRegistryEnrollments.create.mockResolvedValue({
        id: 'enr-new', patient_id: 'pat-1', condition: 'diabetes', status: 'active', enrolled_at: new Date(), last_reviewed_at: new Date(),
        patient: { first_name: 'A', last_name: 'B' }, enrolledBy: null,
      });
      await service.enrollInRegistry(validInput as any, staffUser);
      expect(prisma.chronicRegistryEnrollments.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ patient_id: 'pat-1', condition: 'diabetes', enrolled_by_user_id: 'staff-1' }) }),
      );
    });
  });

  describe('markRegistryReviewed / resolveRegistryEnrollment', () => {
    it('markRegistryReviewed rejects an enrollment in another org', async () => {
      prisma.chronicRegistryEnrollments.findUnique.mockResolvedValue({ id: 'enr-1', is_deleted: false, patient: { client_org_id: 'org-2' } });
      await expect(service.markRegistryReviewed({ enrollment_id: 'enr-1' } as any, staffUser)).rejects.toThrow(NotFoundException);
      expect(prisma.chronicRegistryEnrollments.update).not.toHaveBeenCalled();
    });

    it('markRegistryReviewed resets last_reviewed_at for an in-org enrollment', async () => {
      prisma.chronicRegistryEnrollments.findUnique.mockResolvedValue({ id: 'enr-1', is_deleted: false, patient: { client_org_id: 'org-1' } });
      prisma.chronicRegistryEnrollments.update.mockResolvedValue({
        id: 'enr-1', patient_id: 'pat-1', condition: 'diabetes', status: 'active', enrolled_at: new Date(), last_reviewed_at: new Date(),
        patient: { first_name: 'A', last_name: 'B' }, enrolledBy: null,
      });
      await service.markRegistryReviewed({ enrollment_id: 'enr-1' } as any, staffUser);
      expect(prisma.chronicRegistryEnrollments.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'enr-1' }, data: expect.objectContaining({ last_reviewed_at: expect.any(Date) }) }),
      );
    });

    it('resolveRegistryEnrollment rejects an unknown enrollment', async () => {
      prisma.chronicRegistryEnrollments.findUnique.mockResolvedValue(null);
      await expect(service.resolveRegistryEnrollment({ enrollment_id: 'nope' } as any, staffUser)).rejects.toThrow(NotFoundException);
    });

    it('resolveRegistryEnrollment sets status to resolved', async () => {
      prisma.chronicRegistryEnrollments.findUnique.mockResolvedValue({ id: 'enr-1', is_deleted: false, patient: { client_org_id: 'org-1' } });
      prisma.chronicRegistryEnrollments.update.mockResolvedValue({
        id: 'enr-1', patient_id: 'pat-1', condition: 'diabetes', status: 'resolved', enrolled_at: new Date(), last_reviewed_at: new Date(),
        patient: { first_name: 'A', last_name: 'B' }, enrolledBy: null,
      });
      await service.resolveRegistryEnrollment({ enrollment_id: 'enr-1' } as any, staffUser);
      expect(prisma.chronicRegistryEnrollments.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'resolved' } }),
      );
    });
  });
});
