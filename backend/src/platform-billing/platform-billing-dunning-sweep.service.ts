import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { PlatformBillingService } from './platform-billing.service';

// REQ180 — same @Cron shape as low-stock-sweep.service.ts/
// retention-purge.service.ts: Logger, per-row try/catch continuing the
// loop, its own audit trail (PlatformDunningEvents) rather than the
// generic AuditLogs. This slice's own retry/grace/suspend cadence
// (day 1/3/7 retry, day 10 suspend) is a reasonable default, NOT a cited
// RBI/regulatory requirement -- flagged for product sign-off once real
// usage exists (see the plan doc's own open questions).
const INVOICE_LEAD_DAYS = 3; // generate next cycle's invoice this many days before current_period_end
const SUSPEND_AFTER_DAYS = 10; // days past_due before entitlements are revoked

@Injectable()
export class PlatformBillingDunningSweepService {
  private readonly logger = new Logger(PlatformBillingDunningSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationsService: OrganizationsService,
    private readonly platformBillingService: PlatformBillingService,
  ) {}

  @Cron('0 6 * * *')
  async sweep() {
    await this.generateUpcomingInvoices();
    await this.escalatePastDue();
    await this.finalizeExpiredGracefulCancellations();
  }

  private async generateUpcomingInvoices() {
    const leadCutoff = new Date(Date.now() + INVOICE_LEAD_DAYS * 24 * 60 * 60 * 1000);
    const dueSoon = await this.prisma.platformSubscriptions.findMany({
      where: { status: { in: ['active', 'trialing'] }, cancel_at_period_end: false, current_period_end: { lte: leadCutoff } },
    });
    for (const subscription of dueSoon) {
      try {
        const existingInvoice = await this.prisma.platformInvoices.findFirst({
          where: { subscription_id: subscription.id, due_date: subscription.current_period_end },
        });
        if (existingInvoice) continue; // already generated for this cycle
        await this.platformBillingService.generateNextInvoice(subscription.id);
        this.logger.log(`Generated next-cycle invoice for platform subscription ${subscription.id}`);
      } catch (err) {
        this.logger.error(`Failed to generate next-cycle invoice for subscription ${subscription.id}: ${(err as Error).message}`);
      }
    }
  }

  // Razorpay/Stripe both drive the actual charge attempts and retries on
  // their own schedule once a subscription/mandate is active -- this
  // sweep does not itself call a "charge now" API. What it owns is the
  // ESCALATION on this codebase's own side once a charge_failed webhook
  // has already put a subscription into past_due: log the passing
  // retry-window milestones for visibility, then suspend (revoke
  // entitlements) once the grace window has fully lapsed with no
  // recovering charge_succeeded event.
  private async escalatePastDue() {
    const pastDue = await this.prisma.platformSubscriptions.findMany({ where: { status: 'past_due' } });
    for (const subscription of pastDue) {
      try {
        const lastFailure = await this.prisma.platformDunningEvents.findFirst({
          where: { subscription_id: subscription.id, event_type: 'payment_failed' },
          orderBy: { occurred_at: 'desc' },
        });
        if (!lastFailure) continue;
        const daysSinceFailure = Math.floor((Date.now() - lastFailure.occurred_at.getTime()) / (24 * 60 * 60 * 1000));

        if (daysSinceFailure >= SUSPEND_AFTER_DAYS) {
          await this.prisma.$transaction(async (tx) => {
            await tx.platformSubscriptions.update({ where: { id: subscription.id }, data: { status: 'suspended' } });
            await tx.platformDunningEvents.create({ data: { subscription_id: subscription.id, event_type: 'suspended', metadata: { days_past_due: daysSinceFailure } } });
          });
          await this.organizationsService.assignPlan(subscription.client_org_id, null);
          await this.platformBillingService.notifyOrg(subscription.client_org_id, 'platform_subscription_suspended', {
            title: 'Subscription suspended',
            message: `Your MediBook subscription has been suspended after ${daysSinceFailure} days of failed payment. Update your payment method to restore access.`,
            type: 'payment',
            priority: 'high',
          });
          this.logger.log(`Suspended platform subscription ${subscription.id} after ${daysSinceFailure} days past due`);
          continue;
        }

        if ([1, 3, 7].includes(daysSinceFailure)) {
          const alreadyLoggedToday = await this.prisma.platformDunningEvents.findFirst({
            where: { subscription_id: subscription.id, event_type: 'retry_scheduled', attempt_number: daysSinceFailure },
          });
          if (!alreadyLoggedToday) {
            await this.prisma.platformDunningEvents.create({
              data: { subscription_id: subscription.id, event_type: 'retry_scheduled', attempt_number: daysSinceFailure },
            });
          }
        }
      } catch (err) {
        this.logger.error(`Failed to process dunning escalation for subscription ${subscription.id}: ${(err as Error).message}`);
      }
    }
  }

  // Safety net for the race this feature's own service already guards
  // in applyBillingEvent() (a gateway webhook arriving after
  // cancel_at_period_end finalizes cleanly) -- this catches the OTHER
  // direction: a subscription past its own current_period_end that
  // never received a final charge_succeeded/subscription_cancelled
  // webhook at all (a lost delivery), so a graceful cancellation doesn't
  // silently leave entitlements active forever.
  private async finalizeExpiredGracefulCancellations() {
    const expired = await this.prisma.platformSubscriptions.findMany({
      where: { cancel_at_period_end: true, status: { in: ['active', 'trialing', 'past_due', 'grace'] }, current_period_end: { lte: new Date() } },
    });
    for (const subscription of expired) {
      try {
        await this.prisma.platformSubscriptions.update({ where: { id: subscription.id }, data: { status: 'cancelled', cancelled_at: new Date() } });
        await this.organizationsService.assignPlan(subscription.client_org_id, null);
        this.logger.log(`Finalized graceful cancellation for platform subscription ${subscription.id} (period end passed with no gateway confirmation)`);
      } catch (err) {
        this.logger.error(`Failed to finalize graceful cancellation for subscription ${subscription.id}: ${(err as Error).message}`);
      }
    }
  }
}
