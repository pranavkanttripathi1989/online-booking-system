import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, isPlatformOperator } from '../common/scoping/tenant-scope';

// P1-01/REQ144 — per-tenant WhatsApp conversation spend, read back from the
// same NotificationSendLog rows notification-trigger.service.ts already
// writes (billable/template_category/cost_micro_rupees), rather than a
// second ledger table. "Period" here is the calendar month in IST
// (Asia/Kolkata, this product's fixed India-market timezone — see
// notification-trigger.service.ts's own IST_OFFSET_MINUTES comment for why
// there's no per-org timezone yet), matching how a WhatsApp Business
// account's own monthly conversation-based pricing is billed by Meta.
//
// Exposed for P1-04's entitlement guard to consume as a plan-limit input
// (a per-tenant monthly WhatsApp spend cap) — that guard is deliberately
// out of scope for this slice (CLAUDE.md's own standing caution on
// building the entitlement guard as its own reviewed step).
export interface CategorySpend {
  category: string;
  count: number;
  costMicroRupees: number;
}

export interface ConversationSpend {
  periodStart: Date;
  periodEnd: Date;
  byCategory: CategorySpend[];
  totalCostMicroRupees: number;
}

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

@Injectable()
export class NotificationBillingService {
  constructor(private readonly prisma: PrismaService) {}

  // The start of "this IST calendar month", expressed back in UTC for the
  // Postgres query — computed by shifting into IST, zeroing to the 1st,
  // then shifting back, so a caller anywhere in UTC still gets the
  // IST-local month boundary this org's real billing period uses.
  private currentIstMonthBoundsUtc(now: Date): { start: Date; end: Date } {
    const ist = new Date(now.getTime() + IST_OFFSET_MS);
    const startIst = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1, 0, 0, 0, 0));
    const endIst = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    return { start: new Date(startIst.getTime() - IST_OFFSET_MS), end: new Date(endIst.getTime() - IST_OFFSET_MS) };
  }

  async getConversationSpend(user: JwtPayload, orgId?: string): Promise<ConversationSpend> {
    const { start, end } = this.currentIstMonthBoundsUtc(new Date());
    // A platform operator may pass orgId explicitly to inspect one tenant;
    // an org-scoped caller is always scoped to their own org regardless of
    // any orgId argument (never trust a client-supplied org id — Hard Rule 6).
    const scope = isPlatformOperator(user) ? (orgId ? { client_org_id: orgId } : {}) : orgScope(user);

    const rows = await this.prisma.notificationSendLog.groupBy({
      by: ['template_category'],
      where: { ...scope, channel: 'whatsapp', billable: true, sent_at: { gte: start, lt: end } },
      _count: { _all: true },
      _sum: { cost_micro_rupees: true },
    });

    const byCategory: CategorySpend[] = rows
      .filter((r) => r.template_category !== null)
      .map((r) => ({
        category: r.template_category as string,
        count: r._count._all,
        costMicroRupees: r._sum.cost_micro_rupees ?? 0,
      }));

    return {
      periodStart: start,
      periodEnd: end,
      byCategory,
      totalCostMicroRupees: byCategory.reduce((sum, c) => sum + c.costMicroRupees, 0),
    };
  }
}
