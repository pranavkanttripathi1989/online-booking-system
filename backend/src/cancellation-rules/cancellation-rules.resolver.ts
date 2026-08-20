import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { CancellationRulesService } from './cancellation-rules.service';
import { CancellationRuleType, CancellationRuleMutationResultType } from './entities/cancellation-rule.entity';
import { CreateCancellationRuleInput, UpdateCancellationRuleInput } from './dto/cancellation-rule.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver()
export class CancellationRulesResolver {
  constructor(private readonly cancellationRulesService: CancellationRulesService) {}

  @Query(() => [CancellationRuleType], { name: 'cancellationRules' })
  @Auth('admin', 'super_admin', 'manager')
  cancellationRules(@CurrentUser() user: JwtPayload) {
    return this.cancellationRulesService.list(user);
  }

  @Mutation(() => CancellationRuleMutationResultType, { name: 'createCancellationRule' })
  @Auth('admin', 'super_admin', 'manager')
  createCancellationRule(
    @Args('input') input: CreateCancellationRuleInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cancellationRulesService.create(input, user);
  }

  @Mutation(() => CancellationRuleMutationResultType, { name: 'updateCancellationRule' })
  @Auth('admin', 'super_admin', 'manager')
  updateCancellationRule(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateCancellationRuleInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cancellationRulesService.update(id, input, user);
  }

  @Mutation(() => CancellationRuleMutationResultType, { name: 'deleteCancellationRule' })
  @Auth('admin', 'super_admin', 'manager')
  deleteCancellationRule(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.cancellationRulesService.remove(id, user);
  }
}
