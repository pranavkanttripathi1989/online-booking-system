import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { CreatePlatformSubscriptionInput, CancelPlatformSubscriptionInput } from './dto/platform-billing.input';
import { getProvider, listProviders } from './providers/registry';
import { NormalizedBillingEvent } from './providers/provider.interface';

const PAISE_TO_RUPEES = (paise: number) => paise / 100;
// RBI's AFA threshold for a UPI AutoPay debit -- above this, the tenant
// must actively approve via UPI PIN each cycle (see this feature's own
// Vendor research). Used only to set afa_required on an invoice for
// display; Razorpay itself is what actually enforces this at charge time.
const AFA_THRESHOLD_PAISE = 15000 * 100;

function financialYearFor(date: Date): string {
  const month = date.getMonth() + 1; // 1-12
  const startYear = month >= 4 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

function addPeriod(from: Date, billingPeriod: string): Date {
  const next = new Date(from);
  if (billingPeriod === 'annual') {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

// REQ178/179/180 — platform (tenant SaaS) billing. Genuinely separate
// from the per-clinic patient-payment PaymentGatewayConfigService: ONE
// platform-level account per gateway (env vars), never per-tenant.
@Injectable()
export class PlatformBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationsService: OrganizationsService,
    private readonly notificationTrigger: NotificationTriggerService,
  ) {}

  providers() {
    return listProviders().map((p) => ({ id: p.id, label: p.label }));
  }

  // Platform-level credentials, from env vars -- no DB row, no
  // encryption, matching how the ORIGINAL pre-REQ175 Razorpay
  // integration (before per-clinic credentials existed) was configured,
  // since this is inherently a single-account, platform-owned merchant
  // relationship, not a per-tenant-configurable one (Hard Rule 9's own
  // "fixed vendor" framing, applied here to platform billing itself).
  // Public — also called directly by PlatformBillingWebhooksController,
  // which needs the platform's own credentials to verify a webhook
  // signature before this service ever sees the parsed event.
  getCredentials(gatewayId: string): Record<string, string> {
    if (gatewayId === 'razorpay') {
      return {
        key_id: process.env.RAZORPAY_SUBSCRIPTIONS_KEY_ID ?? '',
        key_secret: process.env.RAZORPAY_SUBSCRIPTIONS_KEY_SECRET ?? '',
        webhook_secret: process.env.RAZORPAY_SUBSCRIPTIONS_WEBHOOK_SECRET ?? '',
      };
    }
    if (gatewayId === 'stripe') {
      return {
        secret_key: process.env.STRIPE_SECRET_KEY ?? '',
        webhook_secret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
      };
    }
    return {};
  }

  private toSubscriptionGraphQL(row: any, authenticationUrl?: string) {
    return {
      id: row.id,
      client_org: { id: row.client_org.id, name: row.client_org.name },
      plan: { id: row.plan.id, name: row.plan.name, tier: row.plan.tier },
      billing_period: row.plan_version.billing_period,
      price: PAISE_TO_RUPEES(row.plan_version.price_paise),
      status: row.status,
      gateway: row.gateway,
      mandate_status: row.mandate_status ?? undefined,
      authentication_url: authenticationUrl,
      current_period_start: row.current_period_start,
      current_period_end: row.current_period_end,
      cancel_at_period_end: row.cancel_at_period_end,
      cancelled_at: row.cancelled_at ?? undefined,
      cancellation_reason: row.cancellation_reason ?? undefined,
      created_at: row.created_at,
    };
  }

  private toInvoiceGraphQL(row: any) {
    return {
      id: row.id,
      subscription_id: row.subscription_id,
      client_org: { id: row.client_org.id, name: row.client_org.name },
      invoice_number: row.invoice_number,
      amount: PAISE_TO_RUPEES(row.amount_paise),
      status: row.status,
      due_date: row.due_date,
      paid_at: row.paid_at ?? undefined,
      gateway: row.gateway,
      pre_debit_notice_sent_at: row.pre_debit_notice_sent_at ?? undefined,
      afa_required: row.afa_required,
      platform_gstin: row.platform_gstin ?? undefined,
      client_org_gstin: row.client_org_gstin ?? undefined,
      hsn_sac_code: row.hsn_sac_code ?? undefined,
      gst_rate: row.gst_rate ?? undefined,
      cgst_amount: row.cgst_amount_paise != null ? PAISE_TO_RUPEES(row.cgst_amount_paise) : undefined,
      sgst_amount: row.sgst_amount_paise != null ? PAISE_TO_RUPEES(row.sgst_amount_paise) : undefined,
      igst_amount: row.igst_amount_paise != null ? PAISE_TO_RUPEES(row.igst_amount_paise) : undefined,
      created_at: row.created_at,
    };
  }

  private readonly SUBSCRIPTION_INCLUDE = { client_org: true, plan: true, plan_version: true };

  async listSubscriptions(status?: string) {
    const rows = await this.prisma.platformSubscriptions.findMany({
      where: status ? { status } : {},
      include: this.SUBSCRIPTION_INCLUDE,
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => this.toSubscriptionGraphQL(r));
  }

  async getSubscription(id: string) {
    const row = await this.prisma.platformSubscriptions.findUnique({ where: { id }, include: this.SUBSCRIPTION_INCLUDE });
    if (!row) return null;
    return this.toSubscriptionGraphQL(row);
  }

  // REQ178 — creates a real subscription against the current PlanVersion
  // (its own id, not just the parent Plan's id, is locked in on the row
  // -- a later plan-catalog edit never retroactively changes this
  // subscriber's committed price, matching PlanVersions' own established
  // versioning contract).
  async createSubscription(input: CreatePlatformSubscriptionInput, user: { sub: string }) {
    const org = await this.prisma.clientOrganizations.findUnique({ where: { id: input.client_org_id } });
    if (!org || org.is_deleted) return { success: false, message: 'Organization not found' };

    const existingActive = await this.prisma.platformSubscriptions.findFirst({
      where: { client_org_id: input.client_org_id, status: { in: ['trialing', 'active', 'past_due', 'grace'] } },
    });
    if (existingActive) return { success: false, message: 'This organization already has an active subscription' };

    const plan = await this.prisma.plans.findUnique({
      where: { id: input.plan_id },
      include: { versions: { where: { effective_until: null }, orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!plan || !plan.is_active) return { success: false, message: 'Plan not found or inactive' };
    const currentVersion = plan.versions[0];
    if (!currentVersion) return { success: false, message: 'This plan has no active version to subscribe to' };

    const provider = getProvider(input.gateway);
    if (!provider) return { success: false, message: `Unknown gateway "${input.gateway}"` };
    const credentials = this.getCredentials(input.gateway);

    const owner = org.owner_user_id ? await this.prisma.users.findUnique({ where: { id: org.owner_user_id }, include: { userProfiles: true } }) : null;
    const ownerProfile = owner?.userProfiles;

    let gatewayResult;
    try {
      gatewayResult = await provider.createSubscription(credentials, {
        planVersionId: currentVersion.id,
        amountPaise: currentVersion.price_paise,
        billingPeriod: currentVersion.billing_period as 'monthly' | 'annual',
        customerName: org.name,
        customerEmail: ownerProfile?.email ?? org.contact_email ?? '',
        customerPhone: ownerProfile?.phone ?? org.contact_phone ?? undefined,
        mandateMaxAmountPaise: Math.min(currentVersion.price_paise, AFA_THRESHOLD_PAISE),
      });
    } catch (e: any) {
      return { success: false, message: e.message ?? `Failed to create ${provider.label} subscription` };
    }

    const now = new Date();
    const created = await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.platformSubscriptions.create({
        data: {
          client_org_id: input.client_org_id,
          plan_id: input.plan_id,
          plan_version_id: currentVersion.id,
          status: 'trialing', // becomes 'active' once the gateway webhook confirms mandate authentication
          gateway: input.gateway,
          gateway_customer_id: gatewayResult.gatewayCustomerId,
          gateway_subscription_id: gatewayResult.gatewaySubscriptionId,
          mandate_status: gatewayResult.mandateStatus,
          mandate_max_amount_paise: Math.min(currentVersion.price_paise, AFA_THRESHOLD_PAISE),
          current_period_start: now,
          current_period_end: addPeriod(now, currentVersion.billing_period),
          created_by_user_id: user.sub,
        },
        include: this.SUBSCRIPTION_INCLUDE,
      });
      return subscription;
    });

    return { success: true, subscription: this.toSubscriptionGraphQL(created, gatewayResult.authenticationUrl) };
  }

  // REQ178 — defaults to a graceful cancel-at-period-end (the tenant
  // keeps paid access through what they already paid for); an
  // immediate cancel is a distinct, explicit choice. Either way, this
  // is a cross-tenant destructive action, so SURF-16's typed-confirmation
  // rule applies at the UI layer, not re-derived here.
  async cancelSubscription(input: CancelPlatformSubscriptionInput, user: { sub: string }) {
    const subscription = await this.prisma.platformSubscriptions.findUnique({ where: { id: input.subscription_id } });
    if (!subscription) return { success: false, message: 'Subscription not found' };
    if (subscription.status === 'cancelled') return { success: false, message: 'This subscription is already cancelled' };

    const provider = getProvider(subscription.gateway);
    if (provider && subscription.gateway_subscription_id) {
      const credentials = this.getCredentials(subscription.gateway);
      const result = await provider.cancelSubscription(credentials, {
        gatewaySubscriptionId: subscription.gateway_subscription_id,
        immediately: !!input.immediately,
      });
      if (!result.success) {
        return { success: false, message: result.error ?? `Failed to cancel at ${provider.label}` };
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.platformSubscriptions.update({
        where: { id: subscription.id },
        data: input.immediately
          ? { status: 'cancelled', cancelled_at: new Date(), cancelled_by_user_id: user.sub, cancellation_reason: input.reason }
          : { cancel_at_period_end: true, cancelled_by_user_id: user.sub, cancellation_reason: input.reason },
      });
      await tx.platformDunningEvents.create({
        data: { subscription_id: subscription.id, event_type: input.immediately ? 'suspended' : 'grace_started', metadata: { reason: input.reason, immediate: !!input.immediately } },
      });
    });

    // Immediate cancel revokes entitlements right away; a graceful
    // cancel-at-period-end leaves them alone until the dunning sweep
    // actually closes the period out -- the tenant keeps what they paid
    // for.
    if (input.immediately) {
      await this.organizationsService.assignPlan(subscription.client_org_id, null);
    }

    return { success: true };
  }

  async listInvoices(subscriptionId?: string, clientOrgId?: string, status?: string) {
    const rows = await this.prisma.platformInvoices.findMany({
      where: {
        ...(subscriptionId ? { subscription_id: subscriptionId } : {}),
        ...(clientOrgId ? { client_org_id: clientOrgId } : {}),
        ...(status ? { status } : {}),
      },
      include: { client_org: true },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => this.toInvoiceGraphQL(r));
  }

  // Cross-org ledger view, same underlying table as listInvoices -- an
  // "invoice" and a "transaction" are the same row in this design (one
  // charge cycle, one invoice, one payment attempt), matching how the
  // competitor research names "failed payments + revenue" as one surface,
  // not two separate ledgers to keep in sync.
  async listTransactions(status?: string) {
    return this.listInvoices(undefined, undefined, status);
  }

  private async nextInvoiceNumber(): Promise<string> {
    const financialYear = financialYearFor(new Date());
    const sequence = await this.prisma.platformInvoiceSequences.upsert({
      where: { financial_year: financialYear },
      create: { financial_year: financialYear, last_number: 1 },
      update: { last_number: { increment: 1 } },
    });
    return `PLAT-INV/${financialYear}/${String(sequence.last_number).padStart(5, '0')}`;
  }

  // Called by the dunning sweep ahead of current_period_end -- creates
  // the next cycle's invoice row (status: 'pending') before any charge
  // is attempted, so a failed/never-attempted charge still has a real
  // invoice record to show, not just a gap.
  async generateNextInvoice(subscriptionId: string) {
    const subscription = await this.prisma.platformSubscriptions.findUnique({
      where: { id: subscriptionId },
      include: { plan_version: true, client_org: true },
    });
    if (!subscription) return null;
    const amountPaise = subscription.plan_version.price_paise;
    return this.prisma.platformInvoices.create({
      data: {
        subscription_id: subscription.id,
        client_org_id: subscription.client_org_id,
        invoice_number: await this.nextInvoiceNumber(),
        amount_paise: amountPaise,
        due_date: subscription.current_period_end,
        gateway: subscription.gateway,
        afa_required: amountPaise > AFA_THRESHOLD_PAISE,
        platform_gstin: process.env.PLATFORM_GSTIN || null,
        client_org_gstin: subscription.client_org.gstin,
      },
    });
  }

  async retryInvoice(invoiceId: string) {
    const invoice = await this.prisma.platformInvoices.findUnique({ where: { id: invoiceId }, include: { subscription: true } });
    if (!invoice) return { success: false, message: 'Invoice not found' };
    if (invoice.status === 'paid') return { success: false, message: 'This invoice is already paid' };
    // A retry is initiated by re-notifying the tenant's mandate/checkout
    // — Razorpay/Stripe both auto-charge an already-active mandate on
    // their own schedule; this codebase doesn't push a charge directly.
    // A manual retry here means: record the attempt and let the
    // gateway's own next billing cycle (or the tenant completing a
    // pending mandate) resolve it, same as any other cycle.
    await this.prisma.platformDunningEvents.create({
      data: { subscription_id: invoice.subscription_id, invoice_id: invoice.id, event_type: 'retry_attempted', metadata: { manual: true } },
    });
    return { success: true };
  }

  // REQ180 — shared by the webhook controller for both gateways, applying
  // the SAME state-transition logic regardless of which gateway sent the
  // event, matching payment-gateways/appointment-payments.service.ts's
  // own applyGatewayEvent() precedent for this exact "one shared handler,
  // multiple webhook sources" shape.
  async applyBillingEvent(gateway: string, event: NormalizedBillingEvent) {
    if (event.type === 'ignored') return { acknowledged: true };
    if (!event.gatewaySubscriptionId) return { acknowledged: true };

    const subscription = await this.prisma.platformSubscriptions.findFirst({
      where: { gateway, gateway_subscription_id: event.gatewaySubscriptionId },
      include: { client_org: true },
    });
    if (!subscription) return { acknowledged: true };

    switch (event.type) {
      case 'subscription_activated': {
        await this.prisma.platformSubscriptions.update({ where: { id: subscription.id }, data: { status: 'active', mandate_status: 'confirmed' } });
        await this.organizationsService.assignPlan(subscription.client_org_id, subscription.plan_id);
        await this.notifyOrg(subscription.client_org_id, 'platform_subscription_created', {
          title: 'Subscription activated',
          message: 'Your MediBook subscription is now active.',
          type: 'payment',
        });
        break;
      }
      case 'charge_succeeded': {
        const pendingInvoice = await this.prisma.platformInvoices.findFirst({
          where: { subscription_id: subscription.id, status: { in: ['pending', 'failed'] } },
          orderBy: { created_at: 'desc' },
        });
        // A subscription already flagged cancel_at_period_end has told
        // the gateway to stop billing after this cycle -- a charge
        // landing here is this cycle's own final, already-paid-for
        // charge, so it finalizes the cancellation rather than renewing
        // for another period. Guards a real race: the super-admin could
        // set cancel_at_period_end after the gateway already initiated
        // this charge.
        const shouldRenew = !subscription.cancel_at_period_end;
        const billingPeriod = await this.billingPeriodFor(subscription.plan_version_id);
        const nextPeriodEnd = shouldRenew ? addPeriod(subscription.current_period_end, billingPeriod) : subscription.current_period_end;
        await this.prisma.$transaction(async (tx) => {
          if (pendingInvoice) {
            await tx.platformInvoices.update({
              where: { id: pendingInvoice.id },
              data: { status: 'paid', paid_at: event.occurredAt ?? new Date(), gateway_payment_id: event.gatewayPaymentId, gateway_invoice_id: event.gatewayInvoiceId },
            });
          }
          await tx.platformSubscriptions.update({
            where: { id: subscription.id },
            data: shouldRenew
              ? { status: 'active', current_period_start: subscription.current_period_end, current_period_end: nextPeriodEnd }
              : { status: 'cancelled', cancelled_at: new Date() },
          });
        });
        await this.organizationsService.assignPlan(subscription.client_org_id, shouldRenew ? subscription.plan_id : null);
        break;
      }
      case 'charge_failed': {
        await this.prisma.$transaction(async (tx) => {
          await tx.platformSubscriptions.update({ where: { id: subscription.id }, data: { status: 'past_due' } });
          await tx.platformDunningEvents.create({ data: { subscription_id: subscription.id, event_type: 'payment_failed' } });
        });
        // past_due keeps entitlements as-is (grace period, per this
        // feature's own design decision) -- the dunning sweep is what
        // eventually suspends after the retry cadence lapses.
        await this.notifyOrg(subscription.client_org_id, 'platform_payment_failed', {
          title: 'Payment failed',
          message: 'Your last subscription payment did not go through. Please check your payment method.',
          type: 'payment',
          priority: 'high',
        });
        break;
      }
      case 'pre_debit_notice_sent': {
        const upcomingInvoice = await this.prisma.platformInvoices.findFirst({
          where: { subscription_id: subscription.id, status: 'pending' },
          orderBy: { created_at: 'desc' },
        });
        if (upcomingInvoice) {
          await this.prisma.platformInvoices.update({
            where: { id: upcomingInvoice.id },
            data: { pre_debit_notice_sent_at: event.occurredAt ?? new Date(), pre_debit_notice_amount_paise: event.amountPaise ?? upcomingInvoice.amount_paise },
          });
        }
        break;
      }
      case 'mandate_paused': {
        await this.prisma.platformSubscriptions.update({ where: { id: subscription.id }, data: { mandate_status: 'paused' } });
        break;
      }
      case 'mandate_revoked':
      case 'subscription_cancelled': {
        await this.prisma.$transaction(async (tx) => {
          await tx.platformSubscriptions.update({
            where: { id: subscription.id },
            data: { status: 'cancelled', mandate_status: event.type === 'mandate_revoked' ? 'revoked' : subscription.mandate_status, cancelled_at: new Date() },
          });
          await tx.platformDunningEvents.create({ data: { subscription_id: subscription.id, event_type: event.type === 'mandate_revoked' ? 'mandate_revoked' : 'suspended' } });
        });
        await this.organizationsService.assignPlan(subscription.client_org_id, null);
        await this.notifyOrg(subscription.client_org_id, 'platform_subscription_suspended', {
          title: event.type === 'mandate_revoked' ? 'Payment mandate revoked' : 'Subscription cancelled',
          message:
            event.type === 'mandate_revoked'
              ? 'Your payment mandate was revoked, so your subscription has been cancelled. Set up a new subscription to restore access.'
              : 'Your subscription has been cancelled.',
          type: 'payment',
          priority: 'high',
        });
        break;
      }
    }
    return { acknowledged: true };
  }

  private async billingPeriodFor(planVersionId: string): Promise<'monthly' | 'annual'> {
    const version = await this.prisma.planVersions.findUnique({ where: { id: planVersionId } });
    return (version?.billing_period as 'monthly' | 'annual') ?? 'monthly';
  }

  // REQ178 — notifies the org's owner if linked, else every admin/manager
  // in the org, matching low-stock-sweep.service.ts's own "every
  // manager/admin in the org" fallback shape for an org-level (not
  // single-user) event.
  async notifyOrg(clientOrgId: string, eventType: string, payload: { title: string; message: string; type: 'payment'; priority?: 'low' | 'medium' | 'high' }) {
    const org = await this.prisma.clientOrganizations.findUnique({ where: { id: clientOrgId } });
    const recipients = org?.owner_user_id
      ? [{ id: org.owner_user_id }]
      : await this.prisma.userProfiles.findMany({ where: { client_org_id: clientOrgId, is_deleted: false, role: { name: { in: ['admin', 'manager'] } } } });
    for (const recipient of recipients) {
      try {
        await this.notificationTrigger.dispatch(recipient.id, eventType, payload);
      } catch {
        // Never let a notification failure block the billing state
        // transition that triggered it -- matches low-stock-sweep's own
        // per-recipient try/catch.
      }
    }
  }
}
