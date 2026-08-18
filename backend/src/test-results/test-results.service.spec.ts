import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TestResultsService } from './test-results.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Security regression coverage: testResults() had no @Auth() role gate and
// no per-patient scoping at all -- any authenticated 'patient' role account
// could read every patient's lab values within the org.
describe('TestResultsService — access scoping', () => {
  let service: TestResultsService;
  let prisma: { testResults: { findMany: jest.Mock; findUnique: jest.Mock } };

  const staffUser: JwtPayload = { sub: 'staff-1', roles: ['clinician'], client_org_id: 'org-1' } as JwtPayload;
  const patientUser: JwtPayload = { sub: 'user-1', roles: ['patient'], client_org_id: 'org-1', patient_id: 'pat-1' } as JwtPayload;

  beforeEach(async () => {
    prisma = { testResults: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [TestResultsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(TestResultsService);
  });

  it('does not restrict by patient_id for a staff caller', async () => {
    await service.findAll(undefined, undefined, undefined, staffUser);
    const where = prisma.testResults.findMany.mock.calls[0][0].where;
    expect(where.patient_id).toBeUndefined();
  });

  it('restricts a patient caller to only their own linked patient_id', async () => {
    await service.findAll(undefined, undefined, undefined, patientUser);
    const where = prisma.testResults.findMany.mock.calls[0][0].where;
    expect(where.patient_id).toBe('pat-1');
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
    });
    await expect(service.findOne('tr-1', patientUser)).resolves.toBeDefined();
  });
});
