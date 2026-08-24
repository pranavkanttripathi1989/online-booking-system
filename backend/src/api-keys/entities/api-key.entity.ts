import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType('ApiKey')
export class ApiKeyType {
  @Field(() => ID) id: string;
  @Field() key_prefix: string;
  @Field() name: string;
  @Field() is_active: boolean;
  @Field({ nullable: true }) last_used_at?: Date;
  @Field({ nullable: true }) revoked_at?: Date;
  @Field() created_at: Date;
}

// The one place the raw key is ever returned — at creation time only,
// matching the webhook-secret and TOTP-backup-code "shown once" convention.
@ObjectType('CreateApiKeyResult')
export class CreateApiKeyResultType {
  @Field(() => ID) id: string;
  @Field() key_prefix: string;
  @Field() name: string;
  @Field() created_at: Date;
  @Field() raw_key: string;
}
