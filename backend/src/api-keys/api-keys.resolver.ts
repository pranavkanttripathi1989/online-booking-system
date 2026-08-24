import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ApiKeysService } from './api-keys.service';
import { ApiKeyType, CreateApiKeyResultType } from './entities/api-key.entity';
import { ApiKeyInput } from './dto/api-key.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Gated to 'manager', not just 'admin'/'super_admin' -- same real finding as
// webhooks.resolver.ts's own comment: 'admin'/'super_admin' are always
// platform-wide in this codebase's isPlatformOperator(), so admin-only
// gating would make this domain's own isSameOrg() cross-tenant check
// unreachable dead code.
@Resolver(() => ApiKeyType)
export class ApiKeysResolver {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [ApiKeyType])
  apiKeys(@CurrentUser() user: JwtPayload) {
    return this.apiKeysService.findAll(user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => CreateApiKeyResultType)
  createApiKey(@Args('input') input: ApiKeyInput, @CurrentUser() user: JwtPayload) {
    return this.apiKeysService.create(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ApiKeyType)
  revokeApiKey(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.apiKeysService.revoke(id, user);
  }
}
