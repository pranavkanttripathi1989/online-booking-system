import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { AdminUserType, PermissionType, RolePermissionType, AuditLogType, AppRoleType } from './entities/user-admin.entity';
import { UserInput, UserUpdateInput, AppRoleInput } from './dto/user-admin.input';
import { AuthUserType, RoleType } from '../auth/entities/user.entity';
import { Auth } from '../common/decorators/auth.decorator';
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
  ) {
    return this.usersService.getAuditLogs(limit, offset, action, resource);
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

  @Auth('admin', 'super_admin')
  @Mutation(() => Boolean)
  deleteRole(@Args('id', { type: () => ID }) id: string) {
    return this.usersService.deleteRole(id);
  }
}
