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
    user: { sub?: string; client_org_id?: string | null; real_actor_id?: string | null } | undefined,
    args: Record<string, unknown> = {},
    ip = '203.0.113.5',
    userAgent = 'Mozilla/5.0 test-agent',
  ) => {
    const req = { user, ip, headers: { 'user-agent': userAgent } };
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getInfo: () => ({ operation: { operation }, fieldName }),
      getContext: () => ({ req }),
      getArgs: () => args,
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
      data: {
        user_id: 'u-1', action: 'create', resource: 'Clinic',
        resource_id: undefined, details: {}, ip_address: '203.0.113.5',
        user_agent: 'Mozilla/5.0 test-agent', outcome: 'success',
      },
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
      data: {
        user_id: 'u-1', action: 'delete', resource: 'Availability Template',
        resource_id: undefined, details: {}, ip_address: '203.0.113.5',
        user_agent: 'Mozilla/5.0 test-agent', outcome: 'success',
      },
    });
  });

  it('still logs a failed mutation (an attempted, rejected action) with outcome: failure', async () => {
    prisma.clientOrganizations.findUnique.mockResolvedValue({ audit_log_enabled: true });
    const ctx = makeContext('mutation', 'createAppointment', { sub: 'u-1', client_org_id: 'org-1' });
    const result$ = interceptor.intercept(ctx, { handle: () => throwError(() => new Error('boom')) });
    await expect(result$.toPromise()).rejects.toThrow('boom');
    await flush();
    expect(prisma.auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'create', resource: 'Appointment', outcome: 'failure' }) }),
    );
  });

  it('a successful mutation is logged with outcome: success', async () => {
    const ctx = makeContext('mutation', 'createClinic', { sub: 'u-1', client_org_id: null });
    await interceptor.intercept(ctx, { handle: () => of('result') }).toPromise();
    await flush();
    expect(prisma.auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ outcome: 'success' }) }),
    );
  });

  it('extracts resource_id from the caller\'s own id argument (update/delete-by-id)', async () => {
    const ctx = makeContext('mutation', 'updateClinic', { sub: 'u-1', client_org_id: null }, { id: 'clinic-42', input: { name: 'X' } });
    await interceptor.intercept(ctx, { handle: () => of({ id: 'clinic-42' }) }).toPromise();
    await flush();
    expect(prisma.auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ resource_id: 'clinic-42' }) }),
    );
  });

  it('falls back to the resolved result\'s own id for a create (which has no id to pass in)', async () => {
    const ctx = makeContext('mutation', 'createClinic', { sub: 'u-1', client_org_id: null }, { input: { name: 'X' } });
    await interceptor.intercept(ctx, { handle: () => of({ id: 'clinic-new-1' }) }).toPromise();
    await flush();
    expect(prisma.auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ resource_id: 'clinic-new-1' }) }),
    );
  });

  it('a failed create has no resource_id at all -- there is no result to read one from, and no id was ever passed in', async () => {
    const ctx = makeContext('mutation', 'createClinic', { sub: 'u-1', client_org_id: null }, { input: { name: 'X' } });
    await interceptor.intercept(ctx, { handle: () => throwError(() => new Error('boom')) }).toPromise().catch(() => {});
    await flush();
    expect(prisma.auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ resource_id: undefined }) }),
    );
  });

  it('captures the real args as details, and captures the real user-agent', async () => {
    const ctx = makeContext('mutation', 'updateClinic', { sub: 'u-1', client_org_id: null }, { id: 'clinic-42', input: { name: 'New Name' } });
    await interceptor.intercept(ctx, { handle: () => of({ id: 'clinic-42' }) }).toPromise();
    await flush();
    expect(prisma.auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          details: { id: 'clinic-42', input: { name: 'New Name' } },
          user_agent: 'Mozilla/5.0 test-agent',
        }),
      }),
    );
  });

  it('redacts a password/token/OTP field in details rather than writing it in plaintext into the audit trail', async () => {
    const ctx = makeContext('mutation', 'resetPassword', undefined, { input: { token: 'reset-tok-abc', new_password: 'S3cret!23' } });
    await interceptor.intercept(ctx, { handle: () => of({ success: true }) }).toPromise();
    await flush();
    expect(prisma.auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          details: { input: { token: '[REDACTED]', new_password: '[REDACTED]' } },
        }),
      }),
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

  // REQ053 (US-SEC-06)
  describe('impersonation attribution', () => {
    it('attributes user_id to the real actor, and records the impersonated identity, during an impersonation session', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue({ audit_log_enabled: true });
      const ctx = makeContext('mutation', 'updateAppointment', { sub: 'target-1', client_org_id: 'org-1', real_actor_id: 'admin-1' });
      await interceptor.intercept(ctx, { handle: () => of('result') }).toPromise();
      await flush();
      expect(prisma.auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ user_id: 'admin-1', acting_as_user_id: 'target-1' }) }),
      );
    });

    it('leaves a non-impersonating caller unaffected — user_id is their own sub, acting_as_user_id absent', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue({ audit_log_enabled: true });
      const ctx = makeContext('mutation', 'updateAppointment', { sub: 'u-1', client_org_id: 'org-1' });
      await interceptor.intercept(ctx, { handle: () => of('result') }).toPromise();
      await flush();
      const call = prisma.auditLogs.create.mock.calls[0][0];
      expect(call.data.user_id).toBe('u-1');
      expect(call.data.acting_as_user_id).toBeUndefined();
    });
  });
});
