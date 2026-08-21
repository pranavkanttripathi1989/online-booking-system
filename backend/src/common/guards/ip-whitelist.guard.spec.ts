import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { IpWhitelistGuard } from './ip-whitelist.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('IpWhitelistGuard', () => {
  let guard: IpWhitelistGuard;
  let prisma: { clientOrganizations: { findUnique: jest.Mock } };

  const makeContext = (user: unknown, ip: string, fieldName = 'someMutation'): ExecutionContext => {
    const gqlCtx = { getContext: () => ({ req: { user, ip } }), getInfo: () => ({ fieldName }) };
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue(gqlCtx as any);
    return {} as ExecutionContext;
  };

  beforeEach(() => {
    prisma = { clientOrganizations: { findUnique: jest.fn() } };
    guard = new IpWhitelistGuard(prisma as unknown as PrismaService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('allows an unauthenticated/org-less request through without querying the org', async () => {
    await expect(guard.canActivate(makeContext(undefined, '1.2.3.4'))).resolves.toBe(true);
    expect(prisma.clientOrganizations.findUnique).not.toHaveBeenCalled();
  });

  it('never restricts an org-less caller (admin/super_admin) — no org to scope a whitelist to', async () => {
    const ctx = makeContext({ client_org_id: null, roles: ['admin'] }, '1.2.3.4');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.clientOrganizations.findUnique).not.toHaveBeenCalled();
  });

  it('never restricts a non-manager role, even in an org with the whitelist enabled', async () => {
    const ctx = makeContext({ client_org_id: 'org-1', roles: ['staff'] }, '1.2.3.4');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.clientOrganizations.findUnique).not.toHaveBeenCalled();
  });

  it('allows through when the org has not enabled the whitelist', async () => {
    prisma.clientOrganizations.findUnique.mockResolvedValue({ ip_whitelist_enabled: false });
    const ctx = makeContext({ client_org_id: 'org-1', roles: ['manager'] }, '9.9.9.9');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('fails open when the whitelist is enabled but the list is empty (avoids an accidental full lockout)', async () => {
    prisma.clientOrganizations.findUnique.mockResolvedValue({ ip_whitelist_enabled: true, ip_whitelist: '' });
    const ctx = makeContext({ client_org_id: 'org-1', roles: ['manager'] }, '9.9.9.9');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('rejects a manager whose IP is not in the org\'s list', async () => {
    prisma.clientOrganizations.findUnique.mockResolvedValue({ ip_whitelist_enabled: true, ip_whitelist: '203.0.113.5, 203.0.113.6' });
    const ctx = makeContext({ client_org_id: 'org-1', roles: ['manager'] }, '9.9.9.9');
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('allows a manager whose IP exactly matches a listed entry', async () => {
    prisma.clientOrganizations.findUnique.mockResolvedValue({ ip_whitelist_enabled: true, ip_whitelist: '203.0.113.5\n203.0.113.6' });
    const ctx = makeContext({ client_org_id: 'org-1', roles: ['manager'] }, '203.0.113.6');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('allows a manager whose IP falls inside a listed CIDR range', async () => {
    prisma.clientOrganizations.findUnique.mockResolvedValue({ ip_whitelist_enabled: true, ip_whitelist: '192.168.1.0/24' });
    const ctx = makeContext({ client_org_id: 'org-1', roles: ['manager'] }, '192.168.1.42');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('rejects a manager whose IP falls outside every listed CIDR range', async () => {
    prisma.clientOrganizations.findUnique.mockResolvedValue({ ip_whitelist_enabled: true, ip_whitelist: '192.168.1.0/24' });
    const ctx = makeContext({ client_org_id: 'org-1', roles: ['manager'] }, '192.168.2.42');
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('strips an IPv6-mapped-IPv4 prefix before comparing', async () => {
    prisma.clientOrganizations.findUnique.mockResolvedValue({ ip_whitelist_enabled: true, ip_whitelist: '127.0.0.1' });
    const ctx = makeContext({ client_org_id: 'org-1', roles: ['manager'] }, '::ffff:127.0.0.1');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  // The exact scenario this exemption exists to prevent: a wrong/typo'd
  // whitelist entry locking the manager out of the one mutation that could
  // fix it.
  it('never blocks updateMyOrgSecuritySettings or myOrgSecuritySettings, even from a disallowed IP', async () => {
    prisma.clientOrganizations.findUnique.mockResolvedValue({ ip_whitelist_enabled: true, ip_whitelist: '203.0.113.5' });
    const updateCtx = makeContext({ client_org_id: 'org-1', roles: ['manager'] }, '9.9.9.9', 'updateMyOrgSecuritySettings');
    await expect(guard.canActivate(updateCtx)).resolves.toBe(true);
    const queryCtx = makeContext({ client_org_id: 'org-1', roles: ['manager'] }, '9.9.9.9', 'myOrgSecuritySettings');
    await expect(guard.canActivate(queryCtx)).resolves.toBe(true);
    expect(prisma.clientOrganizations.findUnique).not.toHaveBeenCalled();
  });
});
