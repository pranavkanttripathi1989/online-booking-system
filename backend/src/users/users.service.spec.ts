import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { BCRYPT_COST } from '../common/crypto/bcrypt-cost';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed-password') }));

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    userProfiles: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    userRoles: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    permissions: { findMany: jest.Mock };
    rolePermissions: { findMany: jest.Mock; deleteMany: jest.Mock; createMany: jest.Mock };
    auditLogs: { findMany: jest.Mock };
    users: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: {
    users: { create: jest.Mock };
    userProfiles: { create: jest.Mock };
    rolePermissions: { deleteMany: jest.Mock; createMany: jest.Mock };
    userRoles: { create: jest.Mock; update: jest.Mock };
  };

  const orgAUser: JwtPayload = { sub: 'admin-1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'admin-2', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const userA = {
    id: 'user-a1',
    email: 'a@org-a.dev',
    first_name: 'Asha',
    last_name: 'Patel',
    is_active: true,
    last_login_at: null,
    avatar_url: null,
    client_org_id: 'org-a',
    is_deleted: false,
    role: { id: 'role-1', name: 'Manager', code: null },
    clinic: null,
  };
  const userB = { ...userA, id: 'user-b1', client_org_id: 'org-b' };

  beforeEach(async () => {
    tx = {
      users: { create: jest.fn() },
      userProfiles: { create: jest.fn() },
      rolePermissions: { deleteMany: jest.fn(), createMany: jest.fn() },
      userRoles: { create: jest.fn(), update: jest.fn() },
    };
    prisma = {
      userProfiles: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      userRoles: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      permissions: { findMany: jest.fn() },
      rolePermissions: { findMany: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() },
      auditLogs: { findMany: jest.fn() },
      users: { create: jest.fn() },
      $transaction: jest.fn((cb) => cb(tx)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(UsersService);
  });

  describe('getUsers — tenant isolation', () => {
    it('scopes to the caller org for an org-linked user', async () => {
      prisma.userProfiles.findMany.mockResolvedValue([]);
      await service.getUsers(undefined, undefined, undefined, undefined, orgAUser);
      expect(prisma.userProfiles.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
    });

    it('does not scope by org for a platform-wide caller', async () => {
      prisma.userProfiles.findMany.mockResolvedValue([]);
      await service.getUsers(undefined, undefined, undefined, undefined, platformUser);
      const where = prisma.userProfiles.findMany.mock.calls[0][0].where;
      // BUG006: this used to assert `client_org_id: undefined` — which is what
      // the buggy `?? undefined` produced, so the test was pinning the defect
      // in place. A platform operator now gets the key OMITTED entirely.
      expect(where).not.toHaveProperty('client_org_id');
    });

    it('an org-less NON-platform caller is scoped to an impossible sentinel', async () => {
      // BUG006 regression. `?? undefined` made this caller unscoped, i.e. able
      // to read every tenant's user directory. The distinction platform-vs-not
      // is the whole fix: absence of an org is not evidence of privilege.
      prisma.userProfiles.findMany.mockResolvedValue([]);
      const orgLess = { sub: 'u-9', roles: ['manager'], client_org_id: null } as any;
      await service.getUsers(undefined, undefined, undefined, undefined, orgLess);
      const where = prisma.userProfiles.findMany.mock.calls[0][0].where;
      expect(where.client_org_id).toBe('__no_org__');
    });

    it('shapes roles/clinic into the admin-facing view', async () => {
      prisma.userProfiles.findMany.mockResolvedValue([userA]);
      const [result] = await service.getUsers(undefined, undefined, undefined, undefined, orgAUser);
      expect(result).toMatchObject({ id: 'user-a1', firstName: 'Asha', lastName: 'Patel' });
      expect(result.roles).toEqual([{ id: 'role-1', name: 'Manager', code: 'manager' }]);
    });
  });

  describe('getUser — tenant isolation (SECURITY fix)', () => {
    it('returns a same-org user', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(userA);
      const result = await service.getUser('user-a1', orgAUser);
      expect(result.id).toBe('user-a1');
    });

    it('rejects a cross-org user with NotFoundException', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(userB);
      await expect(service.getUser('user-b1', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects when the user does not exist', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(null);
      await expect(service.getUser('missing', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects a soft-deleted user', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue({ ...userA, is_deleted: true });
      await expect(service.getUser('user-a1', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('allows a platform-wide caller to read any org user', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(userB);
      await expect(service.getUser('user-b1', platformUser)).resolves.toMatchObject({ id: 'user-b1' });
    });
  });

  describe('getUserRoles — org + global roles', () => {
    it('queries global roles (client_org_id null) or the caller org', async () => {
      prisma.userRoles.findMany.mockResolvedValue([]);
      await service.getUserRoles(orgAUser);
      expect(prisma.userRoles.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { is_deleted: false, OR: [{ client_org_id: null }, { client_org_id: 'org-a' }] } }),
      );
    });
  });

  describe('getPermissions / getRolePermissions', () => {
    it('getPermissions lists all permissions ordered by resource/action', async () => {
      prisma.permissions.findMany.mockResolvedValue([{ id: 'p1', action: 'read', resource: 'Patients', description: null }]);
      const result = await service.getPermissions();
      expect(result).toEqual([{ id: 'p1', action: 'read', resource: 'Patients', description: undefined }]);
    });

    it('getRolePermissions returns permissions for a role', async () => {
      prisma.rolePermissions.findMany.mockResolvedValue([
        { id: 'rp1', permission: { id: 'p1', action: 'read', resource: 'Patients', description: null } },
      ]);
      const result = await service.getRolePermissions('role-1');
      expect(prisma.rolePermissions.findMany).toHaveBeenCalledWith({ where: { role_id: 'role-1', is_deleted: false }, include: { permission: true } });
      expect(result[0].permission.action).toBe('read');
    });
  });

  describe('updateRolePermissions', () => {
    it('replaces the role\'s permission set atomically', async () => {
      await service.updateRolePermissions('role-1', ['p1', 'p2']);
      expect(tx.rolePermissions.deleteMany).toHaveBeenCalledWith({ where: { role_id: 'role-1' } });
      expect(tx.rolePermissions.createMany).toHaveBeenCalledWith({
        data: [{ role_id: 'role-1', permission_id: 'p1' }, { role_id: 'role-1', permission_id: 'p2' }],
      });
    });

    it('skips createMany when clearing all permissions', async () => {
      await service.updateRolePermissions('role-1', []);
      expect(tx.rolePermissions.deleteMany).toHaveBeenCalled();
      expect(tx.rolePermissions.createMany).not.toHaveBeenCalled();
    });
  });

  describe('getAuditLogs', () => {
    it('shapes user info from the joined userProfiles when present', async () => {
      prisma.auditLogs.findMany.mockResolvedValue([
        {
          id: 'log-1', action: 'update', resource: 'Patients', resource_id: 'p1', ip_address: '1.2.3.4',
          created_at: new Date(), details: { foo: 'bar' },
          user: { id: 'user-a1', userProfiles: { first_name: 'Asha', last_name: 'Patel', email: 'a@org-a.dev' } },
        },
      ]);
      const [result] = await service.getAuditLogs(undefined, undefined, undefined, undefined);
      expect(result.user).toEqual({ id: 'user-a1', firstName: 'Asha', lastName: 'Patel', email: 'a@org-a.dev' });
      expect(result.details).toBe(JSON.stringify({ foo: 'bar' }));
    });

    it('omits user when there is no linked profile', async () => {
      prisma.auditLogs.findMany.mockResolvedValue([
        { id: 'log-1', action: 'login', resource: 'Auth', resource_id: null, ip_address: null, created_at: new Date(), details: null, user: null },
      ]);
      const [result] = await service.getAuditLogs(undefined, undefined, undefined, undefined);
      expect(result.user).toBeUndefined();
    });

    it('maps outcome and user_agent through to the GraphQL shape (P3.6)', async () => {
      prisma.auditLogs.findMany.mockResolvedValue([
        {
          id: 'log-1', action: 'create', resource: 'Appointment', resource_id: 'appt-1', ip_address: '1.2.3.4',
          user_agent: 'Mozilla/5.0 test-agent', outcome: 'success',
          created_at: new Date(), details: {}, user: null,
        },
      ]);
      const [result] = await service.getAuditLogs(undefined, undefined, undefined, undefined);
      expect(result.userAgent).toBe('Mozilla/5.0 test-agent');
      expect(result.outcome).toBe('success');
    });

    it('a historical row with no outcome/user_agent (predates both columns) maps to undefined, not null/crash', async () => {
      prisma.auditLogs.findMany.mockResolvedValue([
        { id: 'log-0', action: 'create', resource: 'Appointment', resource_id: null, ip_address: null, created_at: new Date(), details: null, user: null },
      ]);
      const [result] = await service.getAuditLogs(undefined, undefined, undefined, undefined);
      expect(result.userAgent).toBeUndefined();
      expect(result.outcome).toBeUndefined();
    });
  });

  describe('createUser', () => {
    it('rejects a duplicate email without creating', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(userA);
      await expect(
        service.createUser({ name: 'X', email: 'a@org-a.dev', password: 'password1', role_ids: ['role-1'] } as any, orgAUser),
      ).rejects.toThrow(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects an unknown role', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(null);
      prisma.userRoles.findUnique.mockResolvedValue(null);
      await expect(
        service.createUser({ name: 'X', email: 'new@org-a.dev', password: 'password1', role_ids: ['missing'] } as any, orgAUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('stamps client_org_id from the caller, hashes the password, and splits name', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(null);
      prisma.userRoles.findUnique.mockResolvedValue({ id: 'role-1', name: 'Staff' });
      tx.users.create.mockResolvedValue({ id: 'new-user' });
      tx.userProfiles.create.mockResolvedValue({
        id: 'new-user', first_name: 'New', last_name: 'Employee', email: 'new@org-a.dev', role: { name: 'Staff' },
      });

      const result = await service.createUser(
        { name: 'New Employee', email: 'New@Org-A.dev', password: 'password1', role_ids: ['role-1'] } as any,
        orgAUser,
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('password1', BCRYPT_COST);
      expect(tx.userProfiles.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@org-a.dev',
            first_name: 'New',
            last_name: 'Employee',
            client_org_id: 'org-a',
          }),
        }),
      );
      expect(result).toEqual({ id: 'new-user', name: 'New Employee', email: 'new@org-a.dev', roles: [{ name: 'Staff' }] });
    });
  });

  describe('updateUser', () => {
    it('rejects when the user does not exist', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(null);
      await expect(service.updateUser('missing', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('rejects a soft-deleted user', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue({ ...userA, is_deleted: true });
      await expect(service.updateUser('user-a1', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('leaves the password untouched when not supplied', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(userA);
      prisma.userProfiles.update.mockResolvedValue({ ...userA, role: { name: 'Manager' } });
      await service.updateUser('user-a1', { name: 'Asha P' } as any);
      const call = prisma.userProfiles.update.mock.calls[0][0];
      expect(call.data.password).toBeUndefined();
    });

    it('hashes a newly supplied password', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(userA);
      prisma.userProfiles.update.mockResolvedValue({ ...userA, role: { name: 'Manager' } });
      await service.updateUser('user-a1', { password: 'newpassword1' } as any);
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword1', BCRYPT_COST);
      const call = prisma.userProfiles.update.mock.calls[0][0];
      expect(call.data.password).toBe('hashed-password');
    });
  });

  describe('listRoles — org + global roles', () => {
    it('queries global roles or the caller org', async () => {
      prisma.userRoles.findMany.mockResolvedValue([]);
      await service.listRoles(orgAUser);
      expect(prisma.userRoles.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { OR: [{ client_org_id: null }, { client_org_id: 'org-a' }] } }),
      );
    });
  });

  describe('createRole', () => {
    it('stamps client_org_id from the caller and creates permission links', async () => {
      tx.userRoles.create.mockResolvedValue({ id: 'role-new', name: 'Front Desk', is_deleted: false, is_system: false });
      prisma.rolePermissions.findMany.mockResolvedValue([{ permission_id: 'p1' }]);
      await service.createRole({ name: 'Front Desk', permission_ids: ['p1'] } as any, orgAUser);
      expect(tx.userRoles.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
      expect(tx.rolePermissions.createMany).toHaveBeenCalledWith({ data: [{ role_id: 'role-new', permission_id: 'p1' }] });
    });
  });

  describe('updateRole', () => {
    it('rejects when the role does not exist', async () => {
      prisma.userRoles.findUnique.mockResolvedValue(null);
      await expect(service.updateRole('missing', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('rejects modifying a system role', async () => {
      prisma.userRoles.findUnique.mockResolvedValue({ id: 'role-1', is_system: true, is_deleted: false });
      await expect(service.updateRole('role-1', { name: 'Hacked' } as any)).rejects.toThrow(ConflictException);
    });

    it('updates a non-system role and replaces its permission set', async () => {
      prisma.userRoles.findUnique.mockResolvedValue({ id: 'role-1', is_system: false, is_deleted: false });
      tx.userRoles.update.mockResolvedValue({ id: 'role-1', name: 'Renamed', is_deleted: false, is_system: false });
      prisma.rolePermissions.findMany.mockResolvedValue([]);
      await service.updateRole('role-1', { name: 'Renamed', permission_ids: ['p2'] } as any);
      expect(tx.rolePermissions.deleteMany).toHaveBeenCalledWith({ where: { role_id: 'role-1' } });
      expect(tx.rolePermissions.createMany).toHaveBeenCalledWith({ data: [{ role_id: 'role-1', permission_id: 'p2' }] });
    });
  });

  describe('deleteRole', () => {
    it('rejects when the role does not exist', async () => {
      prisma.userRoles.findUnique.mockResolvedValue(null);
      await expect(service.deleteRole('missing')).rejects.toThrow(NotFoundException);
    });

    it('rejects deleting a system role', async () => {
      prisma.userRoles.findUnique.mockResolvedValue({ id: 'role-1', is_system: true, is_deleted: false });
      await expect(service.deleteRole('role-1')).rejects.toThrow(ConflictException);
      expect(prisma.userRoles.update).not.toHaveBeenCalled();
    });

    it('soft-deletes a non-system role', async () => {
      prisma.userRoles.findUnique.mockResolvedValue({ id: 'role-1', is_system: false, is_deleted: false });
      prisma.userRoles.update.mockResolvedValue({ id: 'role-1', is_deleted: true });
      const result = await service.deleteRole('role-1');
      expect(prisma.userRoles.update).toHaveBeenCalledWith({ where: { id: 'role-1' }, data: { is_deleted: true } });
      expect(result).toBe(true);
    });
  });
});
