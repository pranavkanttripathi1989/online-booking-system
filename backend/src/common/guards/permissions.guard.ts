import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';

// REQ049/REQ015 (US-SEC-02) -- closes the "permissions nothing ever reads"
// finding (project-plans/02-findings-register.md): the Permissions/
// RolePermissions tables have been populated since day one via
// updateRolePermissions, but no guard checked them until this one. A
// resolver with no @RequirePermission() at all is unaffected -- same
// fail-open-when-undeclared shape as RolesGuard, not a new default-deny
// posture that would need every existing resolver updated at once.
//
// user.permissions is resolved once, at token-issuance time
// (auth.service.ts), not re-queried per request here -- same pattern this
// codebase already uses for roles/client_org_id/patient_id/clinician_id.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const ctx = GqlExecutionContext.create(context);
    const user: JwtPayload = ctx.getContext().req.user;
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    const granted = user.permissions ?? [];
    const hasPermission = requiredPermissions.some((p) => granted.includes(p));
    if (!hasPermission) {
      // Same message as RolesGuard's rejection -- doesn't reveal which
      // specific permission was missing, or that a permission system
      // exists at all, to a caller probing for one.
      throw new ForbiddenException('You do not have permission to perform this action');
    }
    return true;
  }
}
