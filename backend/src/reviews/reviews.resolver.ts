import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ReviewsService } from './reviews.service';
import { ReviewType, ReviewMutationResultType } from './entities/review.entity';
import { ReviewFilterInput } from './dto/review-filter.input';
import { CreateReviewInput } from './dto/create-review.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => ReviewType)
export class ReviewsResolver {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Auth('admin', 'super_admin', 'manager')
  @Query(() => [ReviewType])
  reviews(@Args('filter', { nullable: true }) filter: ReviewFilterInput, @CurrentUser() user: JwtPayload) {
    return this.reviewsService.findAll(filter, user);
  }

  // P1-06 — patient-only: a caller reviewing on someone's behalf isn't a
  // thing this feature supports (matches the appointment self-scope this
  // reuses from PatientsService.ownAndDependantPatientIds — a dependant
  // profile has no login of its own to submit through).
  @Auth('patient')
  @Mutation(() => ReviewMutationResultType)
  submitReview(@Args('input') input: CreateReviewInput, @CurrentUser() user: JwtPayload) {
    return this.reviewsService.create(input, user);
  }

  @Auth('admin', 'super_admin', 'manager')
  @Mutation(() => ReviewMutationResultType)
  respondToReview(@Args('id', { type: () => ID }) id: string, @Args('response') response: string, @CurrentUser() user: JwtPayload) {
    return this.reviewsService.respondToReview(id, response, user);
  }

  @Auth('admin', 'super_admin', 'manager')
  @Mutation(() => ReviewMutationResultType)
  deleteReview(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.reviewsService.remove(id, user);
  }
}
