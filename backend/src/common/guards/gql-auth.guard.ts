import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// Registered globally (app.module.ts, APP_GUARD) so req.user is populated for
// every request before RolesGuard (also global) ever inspects it — a
// per-resolver-only guard runs AFTER global guards in NestJS regardless of
// @UseGuards() placement, which is what made `@Roles()` alone silently produce
// "Not authenticated" instead of a real permission check (context/backend-hard-rules.md
// Rule 2 — this file is the actual fix, not just the pairing convention).
// TC-AUTH-API-004: rejects requests with no/expired/tampered Authorization header
// before any resolver logic runs, for every resolver except those marked @Public().
@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
