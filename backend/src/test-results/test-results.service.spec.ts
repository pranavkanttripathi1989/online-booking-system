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
    testResults: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; count: jest.Mock; update: jest.Mock };
    patients: { findUnique: jest.Mock };
    userProfiles: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let patientsService: { ownAndDependantPatientIds: jest.Mock };

  const staffUser: JwtPayload = { sub: 'staff-1', roles: ['clinician'], client_org_id: 'org-1' } as JwtPayload;
  const patientUser: JwtPayload = { sub: 'user-1', roles: ['patient'], client_org_id: 'org-1', patient_id: 'pat-1' } as JwtPayload;
  // BUG006: the self-registered archetype — patient role, no org, no patient
  // link. Reachable by anyone via auth.service.ts register().
  const selfRegistered: JwtPayload = { sub: 'user-2', roles: ['patient'], client_org_id: null, patient_id: null } as JwtPayload;

  beforeEach(async () => {
    prisma = {
      testResults: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), create: jest.fn(), count: jest.fn().mockResolvedValue(0), update: jest.fn() },
      patients: { findUnique: jest.fn() },
      userProfiles: { findUnique: jest.fn().mockResolvedValue({ first_name: 'Ada', last_name: 'Ordering' }) },
      // REQ133 — findAll() now runs count()/findMany() inside a
      // $transaction([...]); Promise.all mirrors how the real client awaits
      // an array of already-issued query promises.
      $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
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
    await service.findAll(undefined, undefined, undefined, 200, 1, staffUser);
    const where = prisma.testResults.findMany.mock.calls[0][0].where;
    expect(where.patient_id).toBeUndefined();
  });

  it('restricts a patient caller to only their own linked patient_id (plus any dependants)', async () => {
    await service.findAll(undefined, undefined, undefined, 200, 1, patientUser);
    const where = prisma.testResults.findMany.mock.calls[0][0].where;
    expect(where.patient_id).toEqual({ in: ['pat-1'] });
  });

  // REQ065 (REQ018 US-BOOK-02 residue) — a patient caller may read a
  // dependant's test results too, not just their own.
  it('includes a dependant\'s patient_id in the findAll filter', async () => {
    patientsService.ownAndDependantPatientIds.mockResolvedValue(['pat-1', 'dep-1']);
    await service.findAll(undefined, undefined, undefined, 200, 1, patientUser);
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
    await service.findAll(undefined, undefined, undefined, 200, 1, selfRegistered);
    const where = prisma.testResults.findMany.mock.calls[0][0].where;
    // The key must be PRESENT and impossible to match. Absent — or present and
    // `undefined` — means Prisma applies no filter at all.
    expect(where.ordered_by).toEqual({ client_org_id: '__no_org__' });
    expect(where.patient_id).toEqual({ in: ['__no_patient_link__'] });
  });

  // REQ133 (F-14 residue) — {data, paginatorInfo}, matching
  // appointments.service.ts#findAll's own pagination shape/math exactly.
  // context/open-questions.md #20 -- patient_id already existed on this
  // model (F-08/BUG027), just was never exposed to GraphQL or filterable.
  // Lets patients/detail.jsx's Test Results tab ask for one specific
  // patient's real results instead of staying mock.
  describe('findAll — patientId filter (open-questions.md #20)', () => {
    it('filters to exactly the given patient when patientId is supplied', async () => {
      await service.findAll(undefined, undefined, undefined, 200, 1, staffUser, 'pat-1');
      const where = prisma.testResults.findMany.mock.calls[0][0].where;
      expect(where.patient_id).toBe('pat-1');
    });

    it('omits the patient_id filter entirely when patientId is not supplied', async () => {
      await service.findAll(undefined, undefined, undefined, 200, 1, staffUser);
      const where = prisma.testResults.findMany.mock.calls[0][0].where;
      expect(where.patient_id).toBeUndefined();
    });
  });

  describe('toGraphQL — patient_id exposure (open-questions.md #20)', () => {
    it('exposes the row\'s real patient_id', async () => {
      prisma.testResults.count.mockResolvedValue(1);
      prisma.testResults.findMany.mockResolvedValue([
        { id: 'tr-1', patient_name: 'Anita', patient_id: 'pat-1', test_name: 'CBC', ordered_by_name: 'Dr. A', date_ordered: new Date(), status: 'pending', test_type: 'blood', values: [] },
      ]);
      const result = await service.findAll(undefined, undefined, undefined, 20, 1, staffUser);
      expect(result.data[0].patient_id).toBe('pat-1');
    });

    it('leaves patient_id undefined for a free-text walk-in result', async () => {
      prisma.testResults.count.mockResolvedValue(1);
      prisma.testResults.findMany.mockResolvedValue([
        { id: 'tr-2', patient_name: 'Walk-in', patient_id: null, test_name: 'Lipid', ordered_by_name: 'Dr. A', date_ordered: new Date(), status: 'pending', test_type: 'blood', values: [] },
      ]);
      const result = await service.findAll(undefined, undefined, undefined, 20, 1, staffUser);
      expect(result.data[0].patient_id).toBeUndefined();
    });
  });

  describe('findAll — pagination (REQ133)', () => {
    it('passes skip/take derived from page/first into findMany', async () => {
      await service.findAll(undefined, undefined, undefined, 20, 3, staffUser);
      expect(prisma.testResults.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });

    it('returns data + a correctly-computed paginatorInfo', async () => {
      prisma.testResults.count.mockResolvedValue(45);
      prisma.testResults.findMany.mockResolvedValue([
        { id: 'tr-1', patient_name: 'Anita', test_name: 'CBC', ordered_by_name: 'Dr. A', date_ordered: new Date('2026-08-01'), status: 'pending', test_type: 'blood', values: [] },
      ]);
      const result = await service.findAll(undefined, undefined, undefined, 20, 1, staffUser);
      expect(result.data).toHaveLength(1);
      expect(result.paginatorInfo).toEqual({
        count: 1, currentPage: 1, firstItem: 1, hasMorePages: true, lastItem: 1, lastPage: 3, perPage: 20, total: 45,
      });
    });

    it('hasMorePages is false on the last page', async () => {
      prisma.testResults.count.mockResolvedValue(5);
      prisma.testResults.findMany.mockResolvedValue([]);
      const result = await service.findAll(undefined, undefined, undefined, 20, 1, staffUser);
      expect(result.paginatorInfo.hasMorePages).toBe(false);
      expect(result.paginatorInfo.lastPage).toBe(1);
    });

    it('an empty result set never reports a firstItem below zero', async () => {
      prisma.testResults.count.mockResolvedValue(0);
      prisma.testResults.findMany.mockResolvedValue([]);
      const result = await service.findAll(undefined, undefined, undefined, 20, 1, staffUser);
      expect(result.paginatorInfo.firstItem).toBe(0);
      expect(result.paginatorInfo.total).toBe(0);
    });
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

  // P2-13 — the previously-missing write path. Before this slice, no code
  // anywhere could ever move a TestResults row past 'pending' or attach a
  // value; toGraphQL()'s own "withheld until completed" logic had never
  // once been exercised against a real completed row until these tests.
  describe('recordResult', () => {
    const pendingRow = {
      id: 'tr-1', is_deleted: false, status: 'pending', values: [], date_completed: null,
      patient_name: 'Anita Sharma', test_name: 'CBC', ordered_by_name: 'Dr. A', date_ordered: new Date(),
      test_type: 'Blood Test', ordered_by: { client_org_id: 'org-1' },
    };
    const processingRow = { ...pendingRow, status: 'processing' };
    const completedRow = { ...pendingRow, status: 'completed', values: [{ name: 'Hb', value: '14', ref: '13-17', flag: 'normal' }] };
    const oneValue = [{ name: 'Hb', value: '14', ref: '13-17', flag: 'normal' }];

    it('rejects a missing test result', async () => {
      prisma.testResults.findUnique.mockResolvedValue(null);
      await expect(service.recordResult({ id: 'tr-x', status: 'processing' } as any, staffUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects a cross-org test result', async () => {
      prisma.testResults.findUnique.mockResolvedValue(pendingRow);
      const otherOrgUser: JwtPayload = { sub: 'u2', roles: ['clinician'], client_org_id: 'org-2' } as JwtPayload;
      await expect(service.recordResult({ id: 'tr-1', status: 'processing' } as any, otherOrgUser)).rejects.toThrow(NotFoundException);
      expect(prisma.testResults.update).not.toHaveBeenCalled();
    });

    it('rejects moving an already-completed result to any other status (immutable once completed)', async () => {
      prisma.testResults.findUnique.mockResolvedValue(completedRow);
      await expect(service.recordResult({ id: 'tr-1', status: 'processing' } as any, staffUser)).rejects.toThrow(/cannot move/i);
      expect(prisma.testResults.update).not.toHaveBeenCalled();
    });

    it('rejects processing -> pending as an illegal backward transition', async () => {
      prisma.testResults.findUnique.mockResolvedValue(processingRow);
      await expect(service.recordResult({ id: 'tr-1', status: 'pending' } as any, staffUser)).rejects.toThrow(/cannot move/i);
    });

    it('rejects completing with no values', async () => {
      prisma.testResults.findUnique.mockResolvedValue(pendingRow);
      await expect(service.recordResult({ id: 'tr-1', status: 'completed', values: [] } as any, staffUser)).rejects.toThrow(/at least one result value/i);
      expect(prisma.testResults.update).not.toHaveBeenCalled();
    });

    it('allows pending -> processing with no values', async () => {
      prisma.testResults.findUnique.mockResolvedValue(pendingRow);
      prisma.testResults.update.mockResolvedValue(processingRow);
      await service.recordResult({ id: 'tr-1', status: 'processing' } as any, staffUser);
      expect(prisma.testResults.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'processing', values: [], date_completed: null }) }),
      );
    });

    it('allows pending -> completed directly, skipping processing', async () => {
      prisma.testResults.findUnique.mockResolvedValue(pendingRow);
      prisma.testResults.update.mockResolvedValue(completedRow);
      await service.recordResult({ id: 'tr-1', status: 'completed', values: oneValue } as any, staffUser);
      expect(prisma.testResults.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'completed', values: oneValue }) }),
      );
    });

    it('sets date_completed only on the transition into completed, never on processing', async () => {
      prisma.testResults.findUnique.mockResolvedValue(processingRow);
      prisma.testResults.update.mockResolvedValue(completedRow);
      await service.recordResult({ id: 'tr-1', status: 'completed', values: oneValue } as any, staffUser);
      const data = prisma.testResults.update.mock.calls[0][0].data;
      expect(data.date_completed).toBeInstanceOf(Date);
    });

    it("toGraphQL's withholding logic now returns real values for a genuinely completed row", async () => {
      prisma.testResults.findUnique.mockResolvedValue(pendingRow);
      prisma.testResults.update.mockResolvedValue(completedRow);
      const result = await service.recordResult({ id: 'tr-1', status: 'completed', values: oneValue } as any, staffUser);
      expect(result.status).toBe('completed');
      expect(result.values).toEqual(oneValue);
    });
  });
});
