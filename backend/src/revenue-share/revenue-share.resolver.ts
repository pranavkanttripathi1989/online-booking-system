import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { RevenueShareService } from './revenue-share.service';
import { RevenueShareRuleInput, ComputeMonthlyPayoutsInput } from './dto/revenue-share.input';
import { RevenueShareRuleType, PayoutType, RevenueShareMutationResultType, ComputePayoutsResultType } from './entities/revenue-share.entity';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ158 (P2-06). Manager/admin/super_admin -- doctor compensation is an
// org-scoped financial-management surface, the same gate departments/
// services/insurance already use for the identical reason (see
// CLAUDE.md's own Phase G+2 finding on isPlatformOperator: gating
// admin/super_admin-only would make this domain's own isSameOrg checks
// unreachable dead code).
@Resolver()
export class RevenueShareResolver {
  constructor(private readonly revenueShareService: RevenueShareService) {}

  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [RevenueShareRuleType])
  revenueShareRules(@Args('clinicId', { type: () => ID, nullable: true }) clinicId: string | undefined, @CurrentUser() user: JwtPayload) {
    return this.revenueShareService.revenueShareRules(clinicId, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => RevenueShareMutationResultType)
  setRevenueShareRule(@Args('input') input: RevenueShareRuleInput, @CurrentUser() user: JwtPayload) {
    return this.revenueShareService.setRevenueShareRule(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [PayoutType])
  payouts(
    @Args('clinicId', { type: () => ID, nullable: true }) clinicId: string | undefined,
    @Args('year', { type: () => Int, nullable: true }) year: number | undefined,
    @Args('month', { type: () => Int, nullable: true }) month: number | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.revenueShareService.payouts(clinicId, year, month, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ComputePayoutsResultType)
  computeMonthlyPayouts(@Args('input') input: ComputeMonthlyPayoutsInput, @CurrentUser() user: JwtPayload) {
    return this.revenueShareService.computeMonthlyPayouts(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => PayoutType)
  approvePayout(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.revenueShareService.approvePayout(id, user);
  }
}
