import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

// Registered 'Review' — from-scratch design against reviews/index.jsx's
// MockStore shape (getReviews/respondToReview/deleteReview), no prior
// GraphQL contract existed (next-10-features-implementation-plan.md #9,
// same situation Test Results was in).
@ObjectType('Review')
export class ReviewType {
  @Field(() => ID) id: string;
  @Field() patient_name: string;
  @Field({ nullable: true }) clinician_name?: string;
  @Field(() => Int) stars: number;
  @Field() comment: string;
  @Field({ nullable: true }) response?: string;
  @Field() created_at: Date;
}

@ObjectType('ReviewMutationResult')
export class ReviewMutationResultType {
  @Field() success: boolean;
  @Field(() => ReviewType, { nullable: true }) review?: ReviewType;
}
