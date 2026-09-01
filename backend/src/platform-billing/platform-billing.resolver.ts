import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { PlatformBillingService } from './platform-billing.service';
import {
  PlatformSubscriptionType,
  PlatformInvoiceType,
  PlatformBillingProviderOptionType,
  CreatePlatformSubscriptionResultType,
  PlatformBillingMutationResultType,
} from './entities/platform-billing.entity';
import { CreatePlatformSubscriptionInput, CancelPlatformSubscriptionInput } from './dto/platform-billing.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ178/179/180 — platform financial data, gated tighter than the
// admin-inclusive gates elsewhere in this codebase: super_admin only,
// matching Plans' own precedent. Deliberately cross-org by design (a
// super_admin sees every tenant's billing, the same platform-wide shape
// as plans()/organizationsPaginated()) -- no @CurrentUser() org-scoping
// anywhere in this resolver.
@Resolver()
export class PlatformBillingResolver {
  constructor(private readonly platformBillingService: PlatformBillingService) {}

  @Auth('super_admin')
  @Query(() => [PlatformBillingProviderOptionType])
  platformBillingProviders() {
    return this.platformBillingService.providers();
  }

  @Auth('super_admin')
  @Query(() => [PlatformSubscriptionType])
  platformSubscriptions(@Args('status', { nullable: true }) status?: string) {
    return this.platformBillingService.listSubscriptions(status);
  }

  @Auth('super_admin')
  @Query(() => PlatformSubscriptionType, { nullable: true })
  platformSubscription(@Args('id', { type: () => ID }) id: string) {
    return this.platformBillingService.getSubscription(id);
  }

  @Auth('super_admin')
  @Mutation(() => CreatePlatformSubscriptionResultType)
  createPlatformSubscription(@Args('input') input: CreatePlatformSubscriptionInput, @CurrentUser() user: JwtPayload) {
    return this.platformBillingService.createSubscription(input, user);
  }

  @Auth('super_admin')
  @Mutation(() => PlatformBillingMutationResultType)
  cancelPlatformSubscription(@Args('input') input: CancelPlatformSubscriptionInput, @CurrentUser() user: JwtPayload) {
    return this.platformBillingService.cancelSubscription(input, user);
  }

  @Auth('super_admin')
  @Query(() => [PlatformInvoiceType])
  platformInvoices(
    @Args('subscription_id', { type: () => ID, nullable: true }) subscriptionId?: string,
    @Args('client_org_id', { type: () => ID, nullable: true }) clientOrgId?: string,
    @Args('status', { nullable: true }) status?: string,
  ) {
    return this.platformBillingService.listInvoices(subscriptionId, clientOrgId, status);
  }

  @Auth('super_admin')
  @Query(() => [PlatformInvoiceType])
  platformTransactions(@Args('status', { nullable: true }) status?: string) {
    return this.platformBillingService.listTransactions(status);
  }

  @Auth('super_admin')
  @Mutation(() => PlatformBillingMutationResultType)
  retryPlatformInvoice(@Args('invoice_id', { type: () => ID }) invoiceId: string) {
    return this.platformBillingService.retryInvoice(invoiceId);
  }
}
