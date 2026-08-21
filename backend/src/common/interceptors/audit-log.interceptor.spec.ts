import { of, throwError } from 'rxjs';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;
  let prisma: {
    clientOrganizations: { findUnique: jest.Mock };
    auditLogs: { create: jest.Mock };
  };

  const makeContext = (
    operation: 'query' | 'mutation',
    fieldName: string,
    user: { sub?: string; client_org_id?: string | null } | undefined,
    ip = '203.0.113.5',
  ) => {
    const req = { user, ip };
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getInfo: () => ({ operation: { operation }, fieldName }),
      getContext: () => ({ req }),
    } as any);
    return {} as any; // the raw ExecutionContext is irrelevant -- GqlExecutionContext.create is mocked
  };

  const flush = () => new Promise((resolve) => setImmediate(resolve));

  beforeEach(() => {
    prisma = {
      clientOrganizations: { findUnique: jest.fn() },
      auditLogs: { create: jest.fn().mockResolvedValue({}) },
    };
    interceptor = new AuditLogInterceptor(prisma as unknown as PrismaService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('does not log queries, only mutations', async () => {
    const ctx = makeContext('query', 'appointments', { sub: 'u-1', client_org_id: null });
    await interceptor.intercept(ctx, { handle: () => of('result') }).toPromise();
    await flush();
    expect(prisma.auditLogs.create).not.toHaveBeenCalled();
  });

  it('logs an org-less caller (admin/super_admin) regardless of any org setting', async () => {
    const ctx = makeContext('mutation', 'createClinic', { sub: 'u-1', client_org_id: null });
    await interceptor.intercept(ctx, { handle: () => of('result') }).toPromise();
    await flush();
    expect(prisma.clientOrganizations.findUnique).not.toHaveBeenCalled();
    expect(prisma.auditLogs.create).toHaveBeenCalledWith({
      data: { user_id: 'u-1', action: 'create', resource: 'Clinic', ip_address: '203.0.113.5' },
    });
  });

  it('skips logging when the caller\'s org has audit_log_enabled off', async () => {
    prisma.clientOrganizations.findUnique.mockResolvedValue({ audit_log_enabled: false });
    const ctx = makeContext('mutation', 'updateAppointment', { sub: 'u-1', client_org_id: 'org-1' });
    await interceptor.intercept(ctx, { handle: () => of('result') }).toPromise();
    await flush();
    expect(prisma.auditLogs.create).not.toHaveBeenCalled();
  });

  it('logs when the caller\'s org has audit_log_enabled on', async () => {
    prisma.clientOrganizations.findUnique.mockResolvedValue({ audit_log_enabled: true });
    const ctx = makeContext('mutation', 'deleteAvailabilityTemplate', { sub: 'u-1', client_org_id: 'org-1' });
    await interceptor.intercept(ctx, { handle: () => of('result') }).toPromise();
    await flush();
    expect(prisma.auditLogs.create).toHaveBeenCalledWith({
      data: { user_id: 'u-1', action: 'delete', resource: 'Availability Template', ip_address: '203.0.113.5' },
    });
  });

  it('still logs a failed mutation (an attempted, rejected action)', async () => {
    prisma.clientOrganizations.findUnique.mockResolvedValue({ audit_log_enabled: true });
    const ctx = makeContext('mutation', 'createAppointment', { sub: 'u-1', client_org_id: 'org-1' });
    const result$ = interceptor.intercept(ctx, { handle: () => throwError(() => new Error('boom')) });
    await expect(result$.toPromise()).rejects.toThrow('boom');
    await flush();
    expect(prisma.auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'create', resource: 'Appointment' }) }),
    );
  });

  it('never throws or alters the mutation result when the audit write itself fails', async () => {
    prisma.clientOrganizations.findUnique.mockResolvedValue({ audit_log_enabled: true });
    prisma.auditLogs.create.mockRejectedValue(new Error('db down'));
    const ctx = makeContext('mutation', 'createAppointment', { sub: 'u-1', client_org_id: 'org-1' });
    await expect(interceptor.intercept(ctx, { handle: () => of('real-result') }).toPromise()).resolves.toBe('real-result');
  });

  it('falls back to a generic action/resource for a mutation name that does not match verb+noun convention', async () => {
    const ctx = makeContext('mutation', 'logout', { sub: 'u-1', client_org_id: null });
    await interceptor.intercept(ctx, { handle: () => of('result') }).toPromise();
    await flush();
    expect(prisma.auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'logout' }) }),
    );
  });
});
