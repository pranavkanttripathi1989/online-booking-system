import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// OR semantics — matches frontend RoleGuard behavior (TC-AUTH-UNIT-006):
// the caller needs at least one of the listed roles, not all of them.
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
