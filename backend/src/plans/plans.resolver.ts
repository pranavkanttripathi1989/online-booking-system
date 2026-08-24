import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { PlansService } from './plans.service';
import { PlanType } from './entities/plan.entity';
import { PlanInput, CreatePlanVersionInput } from './dto/plan.input';
import { Auth } from '../common/decorators/auth.decorator';

// REQ032 (US-PLAN-01/02) — platform-level plan builder, super_admin only.
// No @CurrentUser()/org-scoping anywhere in this resolver: a Plan is a
// shared catalog entry, not a per-org record (matching Languages/other
// global lookups' own convention).
@Resolver(() => PlanType)
export class PlansResolver {
  constructor(private readonly plansService: PlansService) {}

  @Auth('super_admin')
  @Query(() => [PlanType])
  plans() {
    return this.plansService.findAll();
  }

  @Auth('super_admin')
  @Query(() => PlanType, { nullable: true })
  plan(@Args('id', { type: () => ID }) id: string) {
    return this.plansService.findOne(id);
  }

  @Auth('super_admin')
  @Mutation(() => PlanType)
  createPlan(@Args('input') input: PlanInput) {
    return this.plansService.create(input);
  }

  @Auth('super_admin')
  @Mutation(() => PlanType)
  createPlanVersion(@Args('input') input: CreatePlanVersionInput) {
    return this.plansService.createNewVersion(input);
  }

  @Auth('super_admin')
  @Mutation(() => PlanType)
  setPlanActive(@Args('id', { type: () => ID }) id: string, @Args('is_active') isActive: boolean) {
    return this.plansService.setActive(id, isActive);
  }
}
