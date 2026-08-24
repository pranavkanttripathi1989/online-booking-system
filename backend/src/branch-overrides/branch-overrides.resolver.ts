import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { BranchOverridesService } from './branch-overrides.service';
import { ProductBranchOverrideType, SetProductBranchOverrideResultType } from './entities/branch-override.entity';
import { SetProductBranchOverrideInput } from './dto/branch-override.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => ProductBranchOverrideType)
export class BranchOverridesResolver {
  constructor(private readonly branchOverridesService: BranchOverridesService) {}

  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [ProductBranchOverrideType])
  productBranchOverrides(
    @Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.branchOverridesService.list(clinicId, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => SetProductBranchOverrideResultType)
  setProductBranchOverride(@Args('input') input: SetProductBranchOverrideInput, @CurrentUser() user: JwtPayload) {
    return this.branchOverridesService.set(input, user);
  }
}
