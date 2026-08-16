import { ObjectType, Field, Int } from '@nestjs/graphql';
import { AuthUserType } from './user.entity';

// TC-AUTH-API-001: field names here are a hard contract — AuthContext.jsx
// destructures access_token/token_type/expires_in/user exactly as named.
@ObjectType('AuthPayload')
export class AuthPayloadType {
  @Field()
  access_token: string;

  @Field()
  refresh_token: string;

  @Field()
  token_type: string;

  @Field(() => Int)
  expires_in: number;

  @Field(() => AuthUserType)
  user: AuthUserType;
}

@ObjectType('GenericResult')
export class GenericResultType {
  @Field()
  success: boolean;

  @Field({ nullable: true })
  message?: string;
}
