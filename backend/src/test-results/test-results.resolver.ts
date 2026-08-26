import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { TestResultsService } from './test-results.service';
import { TestResultType, TestResultPaginatedType } from './entities/test-result.entity';
import { OrderTestInput } from './dto/order-test.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => TestResultType)
export class TestResultsResolver {
  constructor(private readonly testResultsService: TestResultsService) {}

  // REQ133 (F-14 residue) — first defaults to 200 (matching
  // clampTakeMiddleware's own DEFAULT_MAX_TAKE), keeping today's "fetch
  // everything, filter/sort client-side" page behaviour unchanged for
  // every org under that size while making the query genuinely bounded
  // by construction, not just by the global safety-net middleware.
  @Query(() => TestResultPaginatedType)
  testResults(
    @Args('search', { nullable: true }) search: string,
    @Args('type', { nullable: true }) type: string,
    @Args('status', { nullable: true }) status: string,
    @Args('first', { type: () => Int, defaultValue: 200 }) first: number,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.testResultsService.findAll(search, type, status, first, page, user);
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
