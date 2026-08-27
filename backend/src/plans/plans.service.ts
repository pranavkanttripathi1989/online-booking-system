import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanInput, CreatePlanVersionInput, FeatureFlagInput, PlanQuotaInput } from './dto/plan.input';
import { EntitlementsService } from '../entitlements/entitlements.service';

const RUPEES_TO_PAISE = (rupees: number) => Math.round(rupees * 100);
const PAISE_TO_RUPEES = (paise: number) => paise / 100;

function flagsToJson(flags: FeatureFlagInput[]): Record<string, boolean> {
  return Object.fromEntries(flags.map((f) => [f.key, f.enabled]));
}
function jsonToFlags(json: unknown): { key: string; enabled: boolean }[] {
  if (!json || typeof json !== 'object') return [];
  return Object.entries(json as Record<string, boolean>).map(([key, enabled]) => ({ key, enabled }));
}
function quotasToJson(quotas: PlanQuotaInput[]): Record<string, number> {
  return Object.fromEntries(quotas.map((q) => [q.key, q.value]));
}
function jsonToQuotas(json: unknown): { key: string; value: number }[] {
  if (!json || typeof json !== 'object') return [];
  return Object.entries(json as Record<string, number>).map(([key, value]) => ({ key, value }));
}

// REQ032 (US-PLAN-01/02) — plan-builder data model and versioning.
// Platform-level (super_admin-managed catalog), not tenant-scoped.
// PLAN066's own note explained why this deliberately did NOT wire an
// entitlement guard at the time — that arrived as its own, separately
// reviewed step (P1-04, REQ147): ClientOrganizations.plan_id, the real
// org->plan assignment (organizations.resolver.ts's assignOrgPlan), and
// EntitlementsService's read path. This service's only new
// responsibility as a result is invalidating that per-org cache
// whenever a plan's own catalog data changes — every org currently on
// the plan being edited, not just one.
@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  private versionToGraphQL(version: any) {
    return {
      id: version.id,
      version: version.version,
      effective_from: version.effective_from,
      effective_until: version.effective_until ?? undefined,
      billing_period: version.billing_period,
      price: PAISE_TO_RUPEES(version.price_paise),
      feature_flags: jsonToFlags(version.feature_flags_json),
      quotas: jsonToQuotas(version.quotas_json),
    };
  }

  private planToGraphQL(plan: any) {
    const versions = (plan.versions ?? []).map((v: any) => this.versionToGraphQL(v));
    const current = [...(plan.versions ?? [])]
      .filter((v: any) => !v.effective_until)
      .sort((a: any, b: any) => b.version - a.version)[0] ?? [...(plan.versions ?? [])].sort((a: any, b: any) => b.version - a.version)[0];
    return {
      id: plan.id,
      name: plan.name,
      tier: plan.tier,
      is_active: plan.is_active,
      versions,
      current_version: current ? this.versionToGraphQL(current) : undefined,
    };
  }

  async findAll() {
    const plans = await this.prisma.plans.findMany({
      include: { versions: { orderBy: { version: 'asc' } } },
      orderBy: { created_at: 'asc' },
    });
    return plans.map((p) => this.planToGraphQL(p));
  }

  async findOne(id: string) {
    const plan = await this.prisma.plans.findUnique({ where: { id }, include: { versions: { orderBy: { version: 'asc' } } } });
    if (!plan) throw new NotFoundException('Plan not found');
    return this.planToGraphQL(plan);
  }

  async create(input: PlanInput) {
    const plan = await this.prisma.plans.create({
      data: {
        name: input.name,
        tier: input.tier,
        versions: {
          create: {
            version: 1,
            billing_period: input.billing_period,
            price_paise: RUPEES_TO_PAISE(input.price),
            feature_flags_json: flagsToJson(input.feature_flags),
            quotas_json: quotasToJson(input.quotas),
          },
        },
      },
      include: { versions: true },
    });
    return this.planToGraphQL(plan);
  }

  // US-PLAN-02's own acceptance criterion: given plan v1 has active
  // subscribers, editing it produces v2; v1 stays exactly as it was.
  // "Active subscribers" migration (bulk/one-at-a-time, audited) needs a
  // real tenant-plan-assignment table this slice deliberately doesn't
  // build (that's US-PLAN-03's entitlement-enforcement scope) — so this
  // method closes the OLD version's effective_until and opens a new one,
  // which is the versioning half of US-PLAN-02 on its own, self-contained.
  async createNewVersion(input: CreatePlanVersionInput) {
    const plan = await this.prisma.plans.findUnique({
      where: { id: input.plan_id },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!plan) throw new BadRequestException('Plan not found');
    const latest = plan.versions[0];
    const nextVersion = (latest?.version ?? 0) + 1;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (latest && !latest.effective_until) {
        await tx.planVersions.update({ where: { id: latest.id }, data: { effective_until: new Date() } });
      }
      await tx.planVersions.create({
        data: {
          plan_id: input.plan_id,
          version: nextVersion,
          billing_period: input.billing_period,
          price_paise: RUPEES_TO_PAISE(input.price),
          feature_flags_json: flagsToJson(input.feature_flags),
          quotas_json: quotasToJson(input.quotas),
        },
      });
      return tx.plans.findUnique({ where: { id: input.plan_id }, include: { versions: { orderBy: { version: 'asc' } } } });
    });
    // P1-04 — a new version changes what every org currently on this
    // plan is entitled to; their cached entitlements must not outlive it.
    await this.entitlementsService.invalidateOrgsOnPlan(input.plan_id);
    return this.planToGraphQL(updated);
  }

  async setActive(id: string, isActive: boolean) {
    const plan = await this.prisma.plans.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    const updated = await this.prisma.plans.update({
      where: { id },
      data: { is_active: isActive },
      include: { versions: { orderBy: { version: 'asc' } } },
    });
    await this.entitlementsService.invalidateOrgsOnPlan(id);
    return this.planToGraphQL(updated);
  }
}
