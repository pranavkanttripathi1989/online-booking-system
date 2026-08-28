import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

describe('UsersResolver', () => {
  let resolver: UsersResolver;
  let service: Record<string, jest.Mock>;
  const reflector = new Reflector();

  beforeEach(async () => {
    service = {
      getUsers: jest.fn(),
      getUsersStats: jest.fn(),
      getUser: jest.fn(),
      getUserRoles: jest.fn(),
      getPermissions: jest.fn(),
      getRolePermissions: jest.fn(),
      updateRolePermissions: jest.fn(),
      getAuditLogs: jest.fn(),
      getAuditLogsCount: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      listRoles: jest.fn(),
      createRole: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersResolver, { provide: UsersService, useValue: service }],
    }).compile();
    resolver = module.get(UsersResolver);
  });

  describe('role gating (@Auth annotations)', () => {
    it.each([
      ['getUsers', UsersResolver.prototype.getUsers],
      ['getUsersStats', UsersResolver.prototype.getUsersStats],
      ['getUser', UsersResolver.prototype.getUser],
    ])('%s is gated to admin/super_admin/manager', (_name, handler) => {
      expect(reflector.get(ROLES_KEY, handler)).toEqual(['admin', 'super_admin', 'manager']);
    });

    it('getUserRoles is ungated for any authenticated role', () => {
      expect(reflector.get(ROLES_KEY, UsersResolver.prototype.getUserRoles)).toBeUndefined();
    });

    it.each([
      ['getPermissions', UsersResolver.prototype.getPermissions],
      ['getRolePermissions', UsersResolver.prototype.getRolePermissions],
      ['updateRolePermissions', UsersResolver.prototype.updateRolePermissions],
      ['getAuditLogs', UsersResolver.prototype.getAuditLogs],
      ['getAuditLogsCount', UsersResolver.prototype.getAuditLogsCount],
      ['createUser', UsersResolver.prototype.createUser],
      ['updateUser', UsersResolver.prototype.updateUser],
      ['roles', UsersResolver.prototype.roles],
      ['createRole', UsersResolver.prototype.createRole],
      ['updateRole', UsersResolver.prototype.updateRole],
      ['deleteRole', UsersResolver.prototype.deleteRole],
    ])('%s is gated to admin/super_admin only (platform-level, excludes manager)', (_name, handler) => {
      expect(reflector.get(ROLES_KEY, handler)).toEqual(['admin', 'super_admin']);
    });
  });

  describe('argument passthrough', () => {
    it('getUser forwards id and the current user (tenant check lives in the service)', async () => {
      const user = { client_org_id: 'org-a' } as any;
      service.getUser.mockResolvedValue({ id: 'user-1' });
      await resolver.getUser('user-1', user);
      expect(service.getUser).toHaveBeenCalledWith('user-1', user);
    });

    it('createUser forwards input and user', async () => {
      const user = { client_org_id: 'org-a' } as any;
      const input = { name: 'X', email: 'x@y.com', password: 'password1', role_ids: ['role-1'] } as any;
      service.createUser.mockResolvedValue({ id: 'user-new' });
      await resolver.createUser(input, user);
      expect(service.createUser).toHaveBeenCalledWith(input, user);
    });

    it('createRole forwards input and user', async () => {
      const user = { client_org_id: 'org-a' } as any;
      const input = { name: 'X' } as any;
      service.createRole.mockResolvedValue({ id: 'role-new' });
      await resolver.createRole(input, user);
      expect(service.createRole).toHaveBeenCalledWith(input, user);
    });

    it('getUsersStats (BUG029) forwards role, search, and the current user', async () => {
      const user = { client_org_id: 'org-a' } as any;
      service.getUsersStats.mockResolvedValue({ total: 5, active: 3 });
      await resolver.getUsersStats('manager', 'asha', user);
      expect(service.getUsersStats).toHaveBeenCalledWith('manager', 'asha', user);
    });

    it('getAuditLogsCount (BUG029) forwards action, resource, and the current user', async () => {
      const user = { client_org_id: 'org-a' } as any;
      service.getAuditLogsCount.mockResolvedValue(7);
      await resolver.getAuditLogsCount('login', 'appointment', user);
      expect(service.getAuditLogsCount).toHaveBeenCalledWith('login', 'appointment', user);
    });
  });
});
