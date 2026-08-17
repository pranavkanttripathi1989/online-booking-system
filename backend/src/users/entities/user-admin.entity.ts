import { ObjectType, Field, ID } from '@nestjs/graphql';

// Registered 'AdminUserRole' — distinct from auth's canonical 'Role' type
// (login/me's colleague-facing shape). admin/users/index.jsx's getUsers/
// getUser request roles{id name code} nested under a firstName/lastName-split
// User shape that the canonical 'User' type (id/name/email/roles) does not
// have — a real, documented conflict (backend-api-requirements-master-plan.md
// §3 "User"), resolved by giving this admin-facing shape its own type name
// rather than overloading 'User' with two incompatible field sets.
@ObjectType('AdminUserRole')
export class AdminUserRoleType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field({ nullable: true }) code?: string;
}

@ObjectType('AdminUserProfile')
export class AdminUserProfileType {
  @Field(() => ID) id: string;
  @Field({ nullable: true }) avatarUrl?: string;
}

@ObjectType('AdminUserClinic')
export class AdminUserClinicType {
  @Field(() => ID) id: string;
  @Field() name: string;
}

@ObjectType('AdminUser')
export class AdminUserType {
  @Field(() => ID) id: string;
  @Field() email: string;
  @Field() firstName: string;
  @Field() lastName: string;
  @Field() isActive: boolean;
  @Field({ nullable: true }) lastLoginAt?: Date;
  @Field(() => AdminUserProfileType, { nullable: true }) profile?: AdminUserProfileType;
  @Field(() => [AdminUserRoleType]) roles: AdminUserRoleType[];
  @Field(() => AdminUserClinicType, { nullable: true }) clinic?: AdminUserClinicType;
}

@ObjectType('Permission')
export class PermissionType {
  @Field(() => ID) id: string;
  @Field() action: string;
  @Field() resource: string;
  @Field({ nullable: true }) description?: string;
}

@ObjectType('RolePermission')
export class RolePermissionType {
  @Field(() => ID) id: string;
  @Field(() => PermissionType) permission: PermissionType;
}

@ObjectType('AuditLogUser')
export class AuditLogUserType {
  @Field(() => ID) id: string;
  @Field() firstName: string;
  @Field() lastName: string;
  @Field() email: string;
}

@ObjectType('AuditLog')
export class AuditLogType {
  @Field(() => ID) id: string;
  @Field() action: string;
  @Field() resource: string;
  @Field({ nullable: true }) resourceId?: string;
  @Field({ nullable: true }) ipAddress?: string;
  @Field() createdAt: Date;
  @Field({ nullable: true }) details?: string;
  @Field(() => AuditLogUserType, { nullable: true }) user?: AuditLogUserType;
}

// admin/Roles.jsx's Role CRUD — becomes real via this module (MockStore-shaped).
@ObjectType('AppRole')
export class AppRoleType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field({ nullable: true }) description?: string;
  @Field() is_active: boolean;
  @Field() is_system: boolean;
  @Field(() => [ID]) permission_ids: string[];
}
