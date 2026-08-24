import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType('BreakGlassGrant')
export class BreakGlassGrantType {
  @Field(() => ID) id: string;
  @Field(() => ID) grantee_user_id: string;
  @Field() reason: string;
  @Field() granted_at: Date;
  @Field() expires_at: Date;
  @Field({ nullable: true }) revoked_at?: Date;
  @Field() is_active: boolean;
}

@ObjectType('BreakGlassUserError')
export class BreakGlassUserErrorType {
  @Field() message: string;
}

@ObjectType('BreakGlassGrantMutationResult')
export class BreakGlassGrantMutationResultType {
  @Field() success: boolean;
  @Field(() => [BreakGlassUserErrorType]) userErrors: BreakGlassUserErrorType[];
  @Field(() => BreakGlassGrantType, { nullable: true }) grant?: BreakGlassGrantType;
}
