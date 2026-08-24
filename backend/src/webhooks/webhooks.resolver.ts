import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { WebhooksService } from './webhooks.service';
import { WebhookEndpointType, WebhookDeliveryLogType, CreateWebhookEndpointResultType } from './entities/webhook.entity';
import { WebhookEndpointInput } from './dto/webhook.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Gated to 'manager', not just 'admin'/'super_admin' -- found while writing
// this domain's own unit tests: common/scoping/tenant-scope.ts's
// isPlatformOperator() treats EVERY 'admin'/'super_admin' caller as
// platform-wide, unconditionally, regardless of their own client_org_id
// (CLAUDE.md's own documented convention). Gating an org-scoped mutation to
// admin-only roles makes its own isSameOrg() cross-tenant check unreachable
// dead code, since the only callers who could ever reach it are always
// treated as allowed to see every org. 'manager' is this schema's real
// org-scoped top role (the same gate departments/services/insurance use).
@Resolver(() => WebhookEndpointType)
export class WebhooksResolver {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [WebhookEndpointType])
  webhookEndpoints(@CurrentUser() user: JwtPayload) {
    return this.webhooksService.findAll(user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [WebhookDeliveryLogType])
  webhookDeliveryLog(@Args('endpoint_id', { type: () => ID }) endpointId: string, @CurrentUser() user: JwtPayload) {
    return this.webhooksService.deliveryLog(endpointId, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => CreateWebhookEndpointResultType)
  createWebhookEndpoint(@Args('input') input: WebhookEndpointInput, @CurrentUser() user: JwtPayload) {
    return this.webhooksService.create(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => WebhookEndpointType)
  deactivateWebhookEndpoint(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.webhooksService.deactivate(id, user);
  }
}
