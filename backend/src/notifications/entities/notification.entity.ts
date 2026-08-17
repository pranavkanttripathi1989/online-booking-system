import { ObjectType, Field, ID } from '@nestjs/graphql';

// Registered 'Notification' — formalizes notifications/index.jsx's already-
// live inline contract exactly, including its {success}-only mutation
// wrapper (no userErrors — this is the real, exercised contract, Rule 9).
@ObjectType('Notification')
export class NotificationType {
  @Field(() => ID) id: string;
  @Field() title: string;
  @Field() message: string;
  @Field() type: string;
  @Field() priority: string;
  @Field() is_read: boolean;
  @Field() created_at: Date;
}

@ObjectType('NotificationMutationResult')
export class NotificationMutationResultType {
  @Field() success: boolean;
}
