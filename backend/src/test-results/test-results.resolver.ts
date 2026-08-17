import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { TestResultsService } from './test-results.service';
import { TestResultType } from './entities/test-result.entity';
import { OrderTestInput } from './dto/order-test.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => TestResultType)
export class TestResultsResolver {
  constructor(private readonly testResultsService: TestResultsService) {}

  @Query(() => [TestResultType])
  testResults(
    @Args('search', { nullable: true }) search: string,
    @Args('type', { nullable: true }) type: string,
    @Args('status', { nullable: true }) status: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.testResultsService.findAll(search, type, status, user);
  }

  @Query(() => TestResultType, { nullable: true })
  testResult(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.testResultsService.findOne(id, user);
  }

  @Auth('manager', 'admin', 'super_admin', 'clinician', 'staff')
  @Mutation(() => TestResultType)
  orderTest(@Args('input') input: OrderTestInput, @CurrentUser() user: JwtPayload) {
    return this.testResultsService.orderTest(input, user);
  }
}
