import { ObjectType, Field, Int } from '@nestjs/graphql';

// REQ053 (US-SEC-06) — access_token is shown once, the same "shown-once
// secret" pattern webhooks/API keys already use for a value that can't be
// re-fetched later. No refresh_token: an impersonation session is
// deliberately not indefinitely renewable, unlike a real login.
@ObjectType('ImpersonationUserError')
export class ImpersonationUserErrorType {
  @Field() message: string;
}

@ObjectType('ImpersonationResult')
export class ImpersonationResultType {
  @Field() success: boolean;
  @Field(() => [ImpersonationUserErrorType]) userErrors: ImpersonationUserErrorType[];
  @Field({ nullable: true }) access_token?: string;
  @Field(() => Int, { nullable: true }) expires_in?: number;
}

@ObjectType('EndImpersonationResult')
export class EndImpersonationResultType {
  @Field() success: boolean;
  @Field(() => [ImpersonationUserErrorType]) userErrors: ImpersonationUserErrorType[];
}
