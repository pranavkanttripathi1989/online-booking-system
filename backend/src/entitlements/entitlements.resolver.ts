import { Resolver, Query } from '@nestjs/graphql';
import { EntitlementsService } from './entitlements.service';
import { OrgEntitlementsType } from './entities/entitlements.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// P1-04 — any authenticated non-platform-operator caller can read their
// own org's entitlements (usage-vs-quota display, FRONTEND_RULES UI-11's
// "tell the user why" upgrade prompts). No @Auth() role restriction: this
// is self-scoped off the caller's own JWT client_org_id, the same
// "no role gate needed, the scoping IS the access control" pattern
// notifications.resolver.ts's own notifications() query already uses.
@Resolver()
export class EntitlementsResolver {
  constructor(private readonly entitlementsService: EntitlementsService) {}

  @Query(() => OrgEntitlementsType)
  async myEntitlements(@CurrentUser() user: JwtPayload): Promise<OrgEntitlementsType> {
    const resolved = await this.entitlementsService.resolveEntitlements(user.client_org_id);
    if (!resolved) {
      return { is_gated: false, feature_flags: [], quotas: [] };
    }
    return {
      is_gated: true,
      feature_flags: Object.entries(resolved.featureFlags).map(([key, enabled]) => ({ key, enabled })),
      quotas: Object.entries(resolved.quotas).map(([key, value]) => ({ key, value })),
    };
  }
}
