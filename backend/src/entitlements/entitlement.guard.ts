import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Reflector } from '@nestjs/core';
import { EntitlementsService } from './entitlements.service';
import { isPlatformOperator } from '../common/scoping/tenant-scope';

// P1-04 — deliberately NOT registered in app.module.ts's global APP_GUARD
// array (unlike RolesGuard/PermissionsGuard). This is opt-in per resolver,
// via @UseGuards(EntitlementGuard) + @RequiresFeature('key') — exactly the
// "integrate as its own reviewed step, one resolver at a time" caution
// CLAUDE.md carries for this module. A global guard here would risk
// over/under-gating every resolver in the app at once; this can't, by
// construction — it only ever runs where explicitly attached.
export const REQUIRES_FEATURE_KEY = 'requiresFeature';
export const RequiresFeature = (featureKey: string) => SetMetadata(REQUIRES_FEATURE_KEY, featureKey);

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string | undefined>(REQUIRES_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!featureKey) return true; // no @RequiresFeature() on this handler — nothing to check

    const gqlContext = GqlExecutionContext.create(context);
    const user = gqlContext.getContext().req?.user;

    // A platform operator (admin/super_admin) has no single org an
    // entitlement could apply to — same "sees/does everything" default
    // this codebase already uses everywhere else for that role class.
    if (!user || isPlatformOperator(user)) return true;

    const allowed = await this.entitlementsService.hasFeature(user.client_org_id, featureKey);
    if (!allowed) {
      throw new ForbiddenException(`This feature isn't included in your organization's current plan: ${featureKey}`);
    }
    return true;
  }
}
