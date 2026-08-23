import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserInput, UserUpdateInput, AppRoleInput } from './dto/user-admin.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgIdForWrite, orgScope } from '../common/scoping/tenant-scope';
import { BCRYPT_COST } from '../common/crypto/bcrypt-cost';


const slugify = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private toAdminUser(p: any) {
    return {
      id: p.id,
      email: p.email,
      firstName: p.first_name,
      lastName: p.last_name,
      isActive: p.is_active,
      lastLoginAt: p.last_login_at ?? undefined,
      profile: { id: p.id, avatarUrl: p.avatar_url ?? undefined },
      roles: p.role ? [{ id: p.role.id, name: p.role.name, code: p.role.code ?? slugify(p.role.name) }] : [],
      clinic: p.clinic ? { id: p.clinic.id, name: p.clinic.name } : undefined,
    };
  }

  async getUsers(limit: number | undefined, offset: number | undefined, role: string | undefined, search: string | undefined, user: JwtPayload) {
    const rows = await this.prisma.userProfiles.findMany({
      where: {
        is_deleted: false,
        // BUG006 — `?? undefined` is NOT a filter in Prisma: an org-less caller
        // read every tenant's user directory. `orgScope` fails closed instead.
        ...orgScope(user),
        role: role ? { OR: [{ code: role }, { name: role }] } : undefined,
        ...(search
          ? {
              OR: [
                { first_name: { contains: search, mode: 'insensitive' as const } },
                { last_name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: { role: true, clinic: true },
      orderBy: { created_at: 'desc' },
      skip: offset ?? 0,
      take: limit ?? 50,
    });
    return rows.map((r) => this.toAdminUser(r));
  }

  // SECURITY: getUsers() already scopes its list by client_org_id, but this
  // single-record lookup previously didn't — callable by 'manager' (org-scoped,
  // unlike the platform-wide admin/super_admin roles also gated onto this
  // query), it let a manager in one org read any user's admin profile
  // (email, role, clinic) in a different org just by guessing/enumerating an
  // id. Same tenant check as findOne() elsewhere in the codebase.
  async getUser(id: string, user: JwtPayload) {
    const row = await this.prisma.userProfiles.findUnique({ where: { id }, include: { role: true, clinic: true } });
    if (!row || row.is_deleted) throw new NotFoundException('User not found');
    if (user.client_org_id && row.client_org_id !== user.client_org_id) {
      throw new NotFoundException('User not found');
    }
    return this.toAdminUser(row);
  }

  async getUserRoles(user: JwtPayload) {
    const rows = await this.prisma.userRoles.findMany({
      // BUG006 — the `?? undefined` arm collapsed to `{ client_org_id: undefined }`,
      // i.e. "any org", so the OR matched every org's custom roles. Global
      // (client_org_id null) system roles stay visible to everyone by design.
      where: { is_deleted: false, OR: [{ client_org_id: null }, orgScope(user)] },
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => ({ id: r.id, name: r.name, description: r.description || undefined, code: r.code ?? slugify(r.name) }));
  }

  async getPermissions() {
    const rows = await this.prisma.permissions.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
    return rows.map((r) => ({ id: r.id, action: r.action, resource: r.resource, description: r.description || undefined }));
  }

  async getRolePermissions(roleId: string) {
    const rows = await this.prisma.rolePermissions.findMany({
      where: { role_id: roleId, is_deleted: false },
      include: { permission: true },
    });
    return rows.map((r) => ({
      id: r.id,
      permission: { id: r.permission.id, action: r.permission.action, resource: r.permission.resource, description: r.permission.description || undefined },
    }));
  }

  async updateRolePermissions(roleId: string, permissionIds: string[]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermissions.deleteMany({ where: { role_id: roleId } });
      if (permissionIds.length) {
        await tx.rolePermissions.createMany({
          data: permissionIds.map((permission_id) => ({ role_id: roleId, permission_id })),
        });
      }
    });
    return true;
  }

  async getAuditLogs(limit: number | undefined, offset: number | undefined, action: string | undefined, resource: string | undefined) {
    const rows = await this.prisma.auditLogs.findMany({
      where: {
        is_deleted: false,
        action: action ?? undefined,
        resource: resource ?? undefined,
      },
      include: { user: { include: { userProfiles: true } } },
      orderBy: { created_at: 'desc' },
      skip: offset ?? 0,
      take: limit ?? 50,
    });
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      resource: r.resource,
      resourceId: r.resource_id ?? undefined,
      ipAddress: r.ip_address ?? undefined,
      userAgent: r.user_agent ?? undefined,
      outcome: r.outcome ?? undefined,
      createdAt: r.created_at,
      details: r.details ? JSON.stringify(r.details) : undefined,
      user: r.user?.userProfiles
        ? { id: r.user.id, firstName: r.user.userProfiles.first_name, lastName: r.user.userProfiles.last_name, email: r.user.userProfiles.email }
        : undefined,
    }));
  }

  async createUser(input: UserInput, currentUser: JwtPayload) {
    const existing = await this.prisma.userProfiles.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const roleId = input.role_ids[0];
    const role = await this.prisma.userRoles.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const [firstName, ...rest] = input.name.trim().split(' ');
    const hashed = await bcrypt.hash(input.password, BCRYPT_COST);

    const profile = await this.prisma.$transaction(async (tx) => {
      const user = await tx.users.create({ data: {} });
      return tx.userProfiles.create({
        data: {
          id: user.id,
          email: input.email.toLowerCase(),
          password: hashed,
          first_name: firstName || input.name,
          last_name: rest.join(' ') || '',
          role_id: role.id,
          // BUG006 — `?? undefined` silently created an ORG-LESS user row.
          client_org_id: orgIdForWrite(currentUser, 'user'),
        },
        include: { role: true },
      });
    });

    return {
      id: profile.id,
      name: `${profile.first_name} ${profile.last_name}`.trim(),
      email: profile.email,
      roles: [{ name: profile.role.name }],
    };
  }

  async updateUser(id: string, input: UserUpdateInput) {
    const existing = await this.prisma.userProfiles.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) throw new NotFoundException('User not found');

    let firstName = existing.first_name;
    let lastName = existing.last_name;
    if (input.name) {
      const [f, ...rest] = input.name.trim().split(' ');
      firstName = f || input.name;
      lastName = rest.join(' ');
    }

    const data: any = {
      first_name: firstName,
      last_name: lastName,
      email: input.email ? input.email.toLowerCase() : undefined,
      is_active: input.isActive,
      role_id: input.role_ids?.[0] ?? undefined,
    };
    if (input.password) {
      data.password = await bcrypt.hash(input.password, BCRYPT_COST);
    }

    const profile = await this.prisma.userProfiles.update({ where: { id }, data, include: { role: true } });
    return {
      id: profile.id,
      name: `${profile.first_name} ${profile.last_name}`.trim(),
      email: profile.email,
      isActive: profile.is_active,
      roles: [{ name: profile.role.name }],
    };
  }

  // ── admin/Roles.jsx Role CRUD ──────────────────────────────────────────

  private async toAppRole(role: any) {
    const perms = await this.prisma.rolePermissions.findMany({ where: { role_id: role.id, is_deleted: false } });
    return {
      id: role.id,
      name: role.name,
      description: role.description || undefined,
      is_active: !role.is_deleted,
      is_system: role.is_system,
      permission_ids: perms.map((p) => p.permission_id),
    };
  }

  async listRoles(user: JwtPayload) {
    const rows = await this.prisma.userRoles.findMany({
      // BUG006 — see getUserRoles above; same `?? undefined` defect.
      where: { OR: [{ client_org_id: null }, orgScope(user)] },
      orderBy: { name: 'asc' },
    });
    return Promise.all(rows.map((r) => this.toAppRole(r)));
  }

  async createRole(input: AppRoleInput, user: JwtPayload) {
    const role = await this.prisma.$transaction(async (tx) => {
      const created = await tx.userRoles.create({
        data: {
          name: input.name,
          description: input.description ?? '',
          code: slugify(input.name),
          // BUG006 — `?? undefined` created a GLOBAL role visible to every
          // tenant, from a normal org admin's "create custom role" action.
          client_org_id: orgIdForWrite(user, 'role'),
        },
      });
      if (input.permission_ids?.length) {
        await tx.rolePermissions.createMany({
          data: input.permission_ids.map((permission_id) => ({ role_id: created.id, permission_id })),
        });
      }
      return created;
    });
    return this.toAppRole(role);
  }

  async updateRole(id: string, input: AppRoleInput) {
    const existing = await this.prisma.userRoles.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) throw new NotFoundException('Role not found');
    if (existing.is_system) {
      throw new ConflictException('System roles cannot be renamed or have their description changed');
    }
    const role = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.userRoles.update({
        where: { id },
        data: { name: input.name, description: input.description, is_deleted: input.is_active === false },
      });
      if (input.permission_ids) {
        await tx.rolePermissions.deleteMany({ where: { role_id: id } });
        if (input.permission_ids.length) {
          await tx.rolePermissions.createMany({
            data: input.permission_ids.map((permission_id) => ({ role_id: id, permission_id })),
          });
        }
      }
      return updated;
    });
    return this.toAppRole(role);
  }

  async deleteRole(id: string) {
    const existing = await this.prisma.userRoles.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) throw new NotFoundException('Role not found');
    if (existing.is_system) {
      throw new ConflictException('System roles cannot be deleted');
    }
    await this.prisma.userRoles.update({ where: { id }, data: { is_deleted: true } });
    return true;
  }
}
