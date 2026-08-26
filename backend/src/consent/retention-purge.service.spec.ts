import { Test, TestingModule } from '@nestjs/testing';
import { RetentionPurgeService } from './retention-purge.service';
import { PrismaService } from '../prisma/prisma.service';

// REQ034 (US-DPDP-06) — the enforcement half of retention policies. Only
// test_results is a supported data class today (see the service's own
// comment on SUPPORTED_DATA_CLASSES); soft-delete only, legal_hold always
// respected.
describe('RetentionPurgeService', () => {
  let service: RetentionPurgeService;
  let prisma: {
    retentionPolicies: { findMany: jest.Mock };
    testResults: { updateMany: jest.Mock };
    consents: { updateMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      retentionPolicies: { findMany: jest.fn().mockResolvedValue([]) },
      testResults: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      consents: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [RetentionPurgeService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(RetentionPurgeService);
  });

  it('does nothing when there are no due policies', async () => {
    await service.sweep();
    expect(prisma.testResults.updateMany).not.toHaveBeenCalled();
  });

  it('only queries policies with legal_hold: false and a supported data class', async () => {
    await service.sweep();
    expect(prisma.retentionPolicies.findMany).toHaveBeenCalledWith({
      where: { legal_hold: false, data_class: { in: ['test_results', 'consents'] } },
    });
  });

  it('soft-deletes test_results older than the configured retention window, scoped to the policy org', async () => {
    prisma.retentionPolicies.findMany.mockResolvedValue([
      { client_org_id: 'org-a', data_class: 'test_results', retention_years: 7, legal_hold: false },
    ]);
    prisma.testResults.updateMany.mockResolvedValue({ count: 3 });

    await service.sweep();

    expect(prisma.testResults.updateMany).toHaveBeenCalledWith({
      where: {
        is_deleted: false,
        date_ordered: { lt: expect.any(Date) },
        ordered_by: { client_org_id: 'org-a' },
      },
      data: { is_deleted: true },
    });
    const cutoff = prisma.testResults.updateMany.mock.calls[0][0].where.date_ordered.lt;
    const expectedYear = new Date().getFullYear() - 7;
    expect(cutoff.getFullYear()).toBe(expectedYear);
  });

  // REQ113
  it('soft-deletes consents older than the retention window, scoped to the policy org', async () => {
    prisma.retentionPolicies.findMany.mockResolvedValue([
      { client_org_id: 'org-a', data_class: 'consents', retention_years: 3, legal_hold: false },
    ]);
    prisma.consents.updateMany.mockResolvedValue({ count: 2 });

    await service.sweep();

    expect(prisma.consents.updateMany).toHaveBeenCalledWith({
      where: {
        is_deleted: false,
        client_org_id: 'org-a',
        OR: [
          { revoked_at: { not: null, lt: expect.any(Date) } },
          { revoked_at: null, granted_at: { lt: expect.any(Date) } },
        ],
      },
      data: { is_deleted: true },
    });
  });

  it('never touches an unsupported data class even if one somehow comes back from the query', async () => {
    prisma.retentionPolicies.findMany.mockResolvedValue([
      { client_org_id: 'org-a', data_class: 'clinical_records', retention_years: 7, legal_hold: false },
    ]);
    await service.sweep();
    expect(prisma.testResults.updateMany).not.toHaveBeenCalled();
  });

  it('continues to the next policy if one purge fails', async () => {
    prisma.retentionPolicies.findMany.mockResolvedValue([
      { client_org_id: 'org-a', data_class: 'test_results', retention_years: 7, legal_hold: false },
      { client_org_id: 'org-b', data_class: 'test_results', retention_years: 5, legal_hold: false },
    ]);
    prisma.testResults.updateMany
      .mockRejectedValueOnce(new Error('db error'))
      .mockResolvedValueOnce({ count: 1 });

    await expect(service.sweep()).resolves.not.toThrow();
    expect(prisma.testResults.updateMany).toHaveBeenCalledTimes(2);
  });
});
