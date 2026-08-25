import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TestResultsService } from './test-results.service';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Security regression coverage: testResults() had no @Auth() role gate and
// no per-patient scoping at all -- any authenticated 'patient' role account
// could read every patient's lab values within the org.
describe('TestResultsService — access scoping', () => {
  let service: TestResultsService;
  let prisma: {
    testResults: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
    patients: { findUnique: jest.Mock };
    userProfiles: { findUnique: jest.Mock };
  };
  let patientsService: { ownAndDependantPatientIds: jest.Mock };

  const staffUser: JwtPayload = { sub: 'staff-1', roles: ['clinician'], client_org_id: 'org-1' } as JwtPayload;
  const patientUser: JwtPayload = { sub: 'user-1', roles: ['patient'], client_org_id: 'org-1', patient_id: 'pat-1' } as JwtPayload;
  // BUG006: the self-registered archetype — patient role, no org, no patient
  // link. Reachable by anyone via auth.service.ts register().
  const selfRegistered: JwtPayload = { sub: 'user-2', roles: ['patient'], client_org_id: null, patient_id: null } as JwtPayload;

  beforeEach(async () => {
    prisma = {
      testResults: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), create: jest.fn() },
      patients: { findUnique: jest.fn() },
      userProfiles: { findUnique: jest.fn().mockResolvedValue({ first_name: 'Ada', last_name: 'Ordering' }) },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestResultsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: PatientsService,
          // Mirrors the real ownAndDependantPatientIds()'s own behaviour for
          // a patient with no configured dependants -- existing tests below
          // (written before dependant self-scoping existed) keep working
          // unchanged; only the new dependant-specific cases override this.
          useValue: (patientsService = {
            ownAndDependantPatientIds: jest.fn().mockImplementation(async (user: JwtPayload) => [user.patient_id ?? '__no_patient_link__']),
          }),
        },
      ],
    }).compile();
    service = module.get(TestResultsService);
  });

  it('does not restrict by patient_id for a staff caller', async () => {
    await service.findAll(undefined, undefined, undefined, staffUser);
    const where = prisma.testResults.findMany.mock.calls[0][0].where;
    expect(where.patient_id).toBeUndefined();
  });

  it('restricts a patient caller to only their own linked patient_id (plus any dependants)', async () => {
    await service.findAll(undefined, undefined, undefined, patientUser);
    const where = prisma.testResults.findMany.mock.calls[0][0].where;
    expect(where.patient_id).toEqual({ in: ['pat-1'] });
  });

  // REQ065 (REQ018 US-BOOK-02 residue) — a patient caller may read a
  // dependant's test results too, not just their own.
  it('includes a dependant\'s patient_id in the findAll filter', async () => {
    patientsService.ownAndDependantPatientIds.mockResolvedValue(['pat-1', 'dep-1']);
    await service.findAll(undefined, undefined, undefined, patientUser);
    const where = prisma.testResults.findMany.mock.calls[0][0].where;
    expect(where.patient_id).toEqual({ in: ['pat-1', 'dep-1'] });
  });

  it('allows a patient to read a dependant\'s test result via findOne', async () => {
    patientsService.ownAndDependantPatientIds.mockResolvedValue(['pat-1', 'dep-1']);
    prisma.testResults.findUnique.mockResolvedValue({
      id: 'tr-1', is_deleted: false, patient_id: 'dep-1', status: 'completed', date_ordered: new Date(), values: [],
      ordered_by: { client_org_id: 'org-1' },
    });
    await expect(service.findOne('tr-1', patientUser)).resolves.toBeDefined();
  });

  it('still rejects a test result belonging to neither the caller nor their dependants', async () => {
    patientsService.ownAndDependantPatientIds.mockResolvedValue(['pat-1', 'dep-1']);
    prisma.testResults.findUnique.mockResolvedValue({
      id: 'tr-1', is_deleted: false, patient_id: 'pat-2', status: 'completed', date_ordered: new Date(), values: [],
      ordered_by: { client_org_id: 'org-1' },
    });
    await expect(service.findOne('tr-1', patientUser)).rejects.toThrow(NotFoundException);
  });

  it('a patient caller is rejected reading another patient\'s test result', async () => {
    prisma.testResults.findUnique.mockResolvedValue({
      id: 'tr-1', is_deleted: false, patient_id: 'pat-2', status: 'completed', date_ordered: new Date(),
    });
    await expect(service.findOne('tr-1', patientUser)).rejects.toThrow(NotFoundException);
  });

  it('a patient caller can read their own test result', async () => {
    prisma.testResults.findUnique.mockResolvedValue({
      id: 'tr-1', is_deleted: false, patient_id: 'pat-1', status: 'completed', date_ordered: new Date(), values: [],
      // The ordering user is what anchors a TestResults row to a tenant. It was
      // absent from this fixture, which made the row look org-less — and under
      // the pre-BUG006 guard an org-less row was readable by everyone, so the
      // omission went unnoticed. findAll never returned such rows to an
      // org-scoped caller; only findOne did.
      ordered_by: { client_org_id: 'org-1' },
    });
    await expect(service.findOne('tr-1', patientUser)).resolves.toBeDefined();
  });

  // ---- BUG006 regressions -------------------------------------------------
  // Both of these passed against the old code, which is the point: the old
  // guard `if (user.client_org_id && ...)` skipped the org check entirely for
  // an org-less caller, and `row.patient_id !== user.patient_id` was
  // `null !== null` — false — for a free-text result. Live-reproduced over real
  // HTTP in test/integration/tenancy.int-spec.ts.

  it('a self-registered (org-less) caller cannot read a free-text result from another org', async () => {
    prisma.testResults.findUnique.mockResolvedValue({
      id: 'tr-3', is_deleted: false, patient_id: null, status: 'completed', date_ordered: new Date(), values: [],
      ordered_by: { client_org_id: 'org-1' },
    });
    await expect(service.findOne('tr-3', selfRegistered)).rejects.toThrow(NotFoundException);
  });

  it('a self-registered (org-less) caller gets a fail-closed sentinel, not an unfiltered list', async () => {
    await service.findAll(undefined, undefined, undefined, selfRegistered);
    const where = prisma.testResults.findMany.mock.calls[0][0].where;
    // The key must be PRESENT and impossible to match. Absent — or present and
    // `undefined` — means Prisma applies no filter at all.
    expect(where.ordered_by).toEqual({ client_org_id: '__no_org__' });
    expect(where.patient_id).toEqual({ in: ['__no_patient_link__'] });
  });

  // F-08 (project-plans/02-findings-register.md) — orderTest() never wrote
  // patient_id at all, which made the patient self-scoping above dead code:
  // no real row could ever match patient_id: { in: [...] } since none was
  // ever set. These cases prove it's now written, and validated (Hard Rule 6).
  describe('orderTest', () => {
    const validInput = { patient_id: 'pat-1', patient: 'Anita Sharma', testType: 'Blood Test' };

    it('rejects an unknown patient_id', async () => {
      prisma.patients.findUnique.mockResolvedValue(null);
      await expect(service.orderTest(validInput as any, staffUser)).rejects.toThrow();
      expect(prisma.testResults.create).not.toHaveBeenCalled();
    });

    it('rejects a patient belonging to a different org (Hard Rule 6)', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', is_deleted: false, client_org_id: 'org-2' });
      await expect(service.orderTest(validInput as any, staffUser)).rejects.toThrow(NotFoundException);
      expect(prisma.testResults.create).not.toHaveBeenCalled();
    });

    it('writes patient_id on the created row', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', is_deleted: false, client_org_id: 'org-1' });
      prisma.testResults.create.mockResolvedValue({
        id: 'tr-new', patient_name: 'Anita Sharma', test_name: 'Blood Test', ordered_by_name: 'Ada Ordering',
        status: 'pending', date_ordered: new Date(), values: [],
      });
      await service.orderTest(validInput as any, staffUser);
      expect(prisma.testResults.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ patient_id: 'pat-1', patient_name: 'Anita Sharma' }) }),
      );
    });

    it('a platform operator can order a test for a patient with no client_org_id yet', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', is_deleted: false, client_org_id: null });
      prisma.testResults.create.mockResolvedValue({
        id: 'tr-new', patient_name: 'Anita Sharma', test_name: 'Blood Test', ordered_by_name: 'Ada Ordering',
        status: 'pending', date_ordered: new Date(), values: [],
      });
      const platformAdmin: JwtPayload = { sub: 'admin-1', roles: ['admin'], client_org_id: null } as JwtPayload;
      await expect(service.orderTest(validInput as any, platformAdmin)).resolves.toBeDefined();
    });
  });
});
