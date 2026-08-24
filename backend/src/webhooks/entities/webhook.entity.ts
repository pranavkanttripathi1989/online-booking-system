import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

// secret is deliberately never exposed on this type — write-only, like a
// password. A caller who needs to re-verify it created it correctly should
// use testWebhookEndpoint, not read it back.
@ObjectType('WebhookEndpoint')
export class WebhookEndpointType {
  @Field(() => ID) id: string;
  @Field() url: string;
  @Field(() => [String]) event_types: string[];
  @Field() is_active: boolean;
  @Field() created_at: Date;
}

// The one place the plaintext secret is ever returned — at creation time
// only, matching the "copy now, you won't see it again" convention. Every
// other read of a webhook endpoint uses WebhookEndpointType, which omits it.
@ObjectType('CreateWebhookEndpointResult')
export class CreateWebhookEndpointResultType {
  @Field(() => ID) id: string;
  @Field() url: string;
  @Field(() => [String]) event_types: string[];
  @Field() is_active: boolean;
  @Field() created_at: Date;
  @Field() secret: string;
}

@ObjectType('WebhookDeliveryLogEntry')
export class WebhookDeliveryLogType {
  @Field(() => ID) id: string;
  @Field() event_type: string;
  @Field() status: string;
  @Field(() => Int, { nullable: true }) http_status?: number;
  @Field() attempted_at: Date;
  @Field({ nullable: true }) response_snippet?: string;
}
