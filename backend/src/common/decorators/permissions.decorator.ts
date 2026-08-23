import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

// REQ049/REQ015 (US-SEC-02) — OR semantics, matching Roles()'s own
// convention (TC-AUTH-UNIT-006): the caller needs at least one of the
// listed permissions, not all of them.
export const RequirePermission = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
