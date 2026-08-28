import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { AdminUserType, PermissionType, RolePermissionType, AuditLogType, AppRoleType, AdminUsersStatsType } from './entities/user-admin.entity';
import { UserInput, UserUpdateInput, AppRoleInput } from './dto/user-admin.input';
import { AuthUserType, RoleType } from '../auth/entities/user.entity';
import { Auth } from '../common/decorators/auth.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver()
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Auth('admin', 'super_admin', 'manager')
  @Query(() => [AdminUserType])
  getUsers(
    @Args('limit', { type: () => Int, nullable: true }) limit: number,
    @Args('offset', { type: () => Int, nullable: true }) offset: number,
    @Args('role', { nullable: true }) role: string,
    @Args('search', { nullable: true }) search: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.getUsers(limit, offset, role, search, user);
  }

  // BUG029 — getUsers() has no total count; this mirrors its exact filters
  // (role, search, org scope) so the frontend can render a real total.
  @Auth('admin', 'super_admin', 'manager')
  @Query(() => AdminUsersStatsType)
  getUsersStats(
    @Args('role', { nullable: true }) role: string,
    @Args('search', { nullable: true }) search: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.getUsersStats(role, search, user);
  }

  @Auth('admin', 'super_admin', 'manager')
  @Query(() => AdminUserType)
  getUser(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.getUser(id, user);
  }

  @Query(() => [RoleType])
  getUserRoles(@CurrentUser() user: JwtPayload) {
    return this.usersService.getUserRoles(user);
  }

  @Auth('admin', 'super_admin')
  @Query(() => [PermissionType])
  getPermissions() {
    return this.usersService.getPermissions();
  }

  @Auth('admin', 'super_admin')
  @Query(() => [RolePermissionType])
  getRolePermissions(@Args('roleId', { type: () => ID }) roleId: string) {
    return this.usersService.getRolePermissions(roleId);
  }

  @Auth('admin', 'super_admin')
  @Mutation(() => Boolean)
  updateRolePermissions(@Args('roleId', { type: () => ID }) roleId: string, @Args('permissionIds', { type: () => [ID] }) permissionIds: string[]) {
    return this.usersService.updateRolePermissions(roleId, permissionIds);
  }

  @Auth('admin', 'super_admin')
  @Query(() => [AuditLogType])
  getAuditLogs(
    @Args('limit', { type: () => Int, nullable: true }) limit: number,
    @Args('offset', { type: () => Int, nullable: true }) offset: number,
    @Args('action', { nullable: true }) action: string,
    @Args('resource', { nullable: true }) resource: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.getAuditLogs(limit, offset, action, resource, user);
  }

  // BUG029 — same missing-total problem, for the Audit Logs tab.
  @Auth('admin', 'super_admin')
  @Query(() => Int)
  getAuditLogsCount(
    @Args('action', { nullable: true }) action: string,
    @Args('resource', { nullable: true }) resource: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.getAuditLogsCount(action, resource, user);
  }

  @Auth('admin', 'super_admin')
  @Mutation(() => AuthUserType)
  createUser(@Args('input') input: UserInput, @CurrentUser() user: JwtPayload) {
    return this.usersService.createUser(input, user);
  }

  @Auth('admin', 'super_admin')
  @Mutation(() => AuthUserType)
  updateUser(@Args('id', { type: () => ID }) id: string, @Args('input') input: UserUpdateInput) {
    return this.usersService.updateUser(id, input);
  }

  // ── admin/Roles.jsx Role CRUD ──────────────────────────────────────────

  @Auth('admin', 'super_admin')
  @Query(() => [AppRoleType])
  roles(@CurrentUser() user: JwtPayload) {
    return this.usersService.listRoles(user);
  }

  @Auth('admin', 'super_admin')
  @Mutation(() => AppRoleType)
  createRole(@Args('input') input: AppRoleInput, @CurrentUser() user: JwtPayload) {
    return this.usersService.createRole(input, user);
  }

  @Auth('admin', 'super_admin')
  @Mutation(() => AppRoleType)
  updateRole(@Args('id', { type: () => ID }) id: string, @Args('input') input: AppRoleInput) {
    return this.usersService.updateRole(id, input);
  }

  // REQ049/REQ015 (US-SEC-02) -- the one mutation this session wires as
  // proof the guard is real, not just declared. @Auth already restricts
  // this to admin/super_admin; @RequirePermission adds a second, genuinely
  // independent check against the caller's actual granted permissions
  // (seed.ts grants both roles every permission today, so this changes
  // nothing about who can call it right now -- it changes what happens
  // once a real deployment edits RolePermissions to narrow that).
  @Auth('admin', 'super_admin')
  @RequirePermission('roles.delete')
  @Mutation(() => Boolean)
  deleteRole(@Args('id', { type: () => ID }) id: string) {
    return this.usersService.deleteRole(id);
  }
}
