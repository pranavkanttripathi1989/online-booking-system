import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType('Role')
export class RoleType {
  // Optional — login/me only ever populate `name` (their real, live contract);
  // the Users/RBAC module (users.service.ts) populates all three when
  // resolving getUserRoles, reusing this same registered 'Role' type rather
  // than a second GraphQL type with an unavoidably colliding name.
  @Field(() => ID, { nullable: true })
  id?: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  // admin/users/index.jsx's getUserRoles requests roles{code} — same short
  // slug already exposed on the admin-facing AdminUserRoleType (user-admin.entity.ts);
  // added here too since getUserRoles reuses this canonical 'Role' type.
  @Field({ nullable: true })
  code?: string;
}

@ObjectType('ClinicianTypeInfo')
export class ClinicianTypeInfoType {
  @Field()
  id: string;

  @Field()
  name: string;

  // Added for the Clinicians domain increment (CLINICIAN_FIELDS fragment wants
  // clinician_type { id name description }) — optional so auth's own usage,
  // which never sets this, stays unaffected.
  @Field({ nullable: true })
  description?: string;
}

@ObjectType('ClinicianInfo')
export class ClinicianInfoType {
  @Field()
  id: string;

  @Field()
  full_name: string;

  @Field({ nullable: true })
  avatar_url?: string;

  // Clinicians.clinician_type is a plain string in the schema today (no FK to
  // ClinicianTypeModel yet — that relation belongs to the Clinicians domain
  // increment, not this one), so id/name are both synthesized from that string.
  @Field(() => ClinicianTypeInfoType, { nullable: true })
  clinician_type?: ClinicianTypeInfoType;
}

// Named 'User' (not 'AuthUser') deliberately — frontend/src/graphql/queries.js's
// USER_FIELDS fragment is declared as `fragment UserFields on User`, and a
// fragment's type condition must match the GraphQL type name exactly.
@ObjectType('User')
export class AuthUserType {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field()
  name: string;

  // Data model currently supports one role per user (UserProfiles.role_id);
  // wrapped as an array to match the frontend's existing user.roles[].name
  // contract (AuthContext.jsx hasRole) — see phase1-docker-auth-implementation-plan.md.
  @Field(() => [RoleType])
  roles: RoleType[];

  @Field(() => ClinicianInfoType, { nullable: true })
  clinician?: ClinicianInfoType | null;

  @Field({ nullable: true })
  client_org_id?: string;

  // admin/users/index.jsx's ToggleUser mutation requests updateUser(...){isActive} —
  // optional so login/me (which never sets it) stay unaffected.
  @Field({ nullable: true })
  isActive?: boolean;
}
