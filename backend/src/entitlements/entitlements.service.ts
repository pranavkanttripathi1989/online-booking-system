import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';

// P1-04 — the entitlement guard's read path. CLAUDE.md's own standing
// caution on this exact module: build the data model and the read path
// first, integrate into the shared guard chain as its own later, separately
// reviewed step. This service is that read path — resolveEntitlements()/
// hasFeature()/getQuota() are called explicitly by whichever resolver opts
// in (via @UseGuards(EntitlementGuard), see entitlement.guard.ts), never
// registered in app.module.ts's global APP_GUARD array.
export interface ResolvedEntitlements {
  featureFlags: Record<string, boolean>;
  quotas: Record<string, number>;
}

const CACHE_TTL_SECONDS = 300;

@Injectable()
export class EntitlementsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private cacheKey(orgId: string): string {
    return `entitlements:org:${orgId}`;
  }

  // Returns null for "ungated" (every feature allowed, every quota
  // unlimited) — the deliberate default for an org.less caller (a
  // platform operator), an org with no plan_id assigned yet (true of
  // every real org today — this is a new mechanism, not backfilled), or
  // an assigned plan with no currently-effective PlanVersion (a data
  // gap that is the platform's fault, not this caller's — fail open,
  // never lock a real org out over an admin data-entry gap).
  async resolveEntitlements(orgId: string | null | undefined): Promise<ResolvedEntitlements | null> {
    if (!orgId) return null;

    const cached = await this.redis.get(this.cacheKey(orgId));
    if (cached !== null) {
      return JSON.parse(cached) as ResolvedEntitlements;
    }

    const resolved = await this.resolveFromDatabase(orgId);
    // Cache the "ungated" (null) result too, as a real JSON null literal —
    // otherwise every request for a plan-less org would skip the cache
    // and hit Postgres on every call, defeating the point of caching for
    // the majority of orgs (all of them, today).
    await this.redis.set(this.cacheKey(orgId), JSON.stringify(resolved), 'EX', CACHE_TTL_SECONDS);
    return resolved;
  }

  private async resolveFromDatabase(orgId: string): Promise<ResolvedEntitlements | null> {
    const org = await this.prisma.clientOrganizations.findUnique({ where: { id: orgId }, select: { plan_id: true } });
    if (!org?.plan_id) return null;

    const now = new Date();
    const version = await this.prisma.planVersions.findFirst({
      where: {
        plan_id: org.plan_id,
        effective_from: { lte: now },
        OR: [{ effective_until: null }, { effective_until: { gt: now } }],
      },
      orderBy: { version: 'desc' },
    });
    if (!version) return null;

    return {
      featureFlags: (version.feature_flags_json as Record<string, boolean>) ?? {},
      quotas: (version.quotas_json as Record<string, number>) ?? {},
    };
  }

  // A plan's feature_flags_json is an explicit, deliberate grant list —
  // once an org actually has a plan, a feature that plan's current
  // version never mentions is treated as NOT granted (false), not
  // silently allowed. This is asymmetric with getQuota() below on
  // purpose: a feature list enumerates what's INCLUDED; a quota list
  // enumerates what's LIMITED, so an unlisted quota means "not
  // constrained by this plan" (unlimited), not "zero".
  async hasFeature(orgId: string | null | undefined, key: string): Promise<boolean> {
    const entitlements = await this.resolveEntitlements(orgId);
    if (!entitlements) return true; // ungated org
    return entitlements.featureFlags[key] ?? false;
  }

  // Returns null for "no cap" (either the org is fully ungated, or this
  // plan version simply doesn't constrain this quota dimension).
  async getQuota(orgId: string | null | undefined, key: string): Promise<number | null> {
    const entitlements = await this.resolveEntitlements(orgId);
    if (!entitlements) return null;
    return entitlements.quotas[key] ?? null;
  }

  async invalidateOrg(orgId: string): Promise<void> {
    await this.redis.del(this.cacheKey(orgId));
  }

  // Called when a Plan's own catalog changes (a new version created, or
  // is_active toggled) — every org currently assigned to that plan needs
  // its cache dropped, not just the one org a direct assignment mutation
  // would target. Plan edits are a rare admin action, so one findMany is
  // an acceptable cost against the alternative (a stale cache for up to
  // CACHE_TTL_SECONDS after every plan edit).
  async invalidateOrgsOnPlan(planId: string): Promise<void> {
    const orgs = await this.prisma.clientOrganizations.findMany({ where: { plan_id: planId }, select: { id: true } });
    if (orgs.length === 0) return;
    await this.redis.del(...orgs.map((o) => this.cacheKey(o.id)));
  }
}
