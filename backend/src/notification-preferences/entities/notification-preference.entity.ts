import { ObjectType, Field, ID } from '@nestjs/graphql';

// settings/index.jsx's Notifications tab. event_type is exposed as a plain
// String (not a native GraphQL enum) -- matches the established convention
// elsewhere in this codebase (e.g. cancellation-rules' fee_type/rule_type)
// of validating string enums via @IsIn() on the input side rather than
// registering a GraphQL enum type for every Prisma enum.
@ObjectType('NotificationPreference')
export class NotificationPreferenceType {
  @Field(() => ID) id: string;
  @Field() event_type: string;
  @Field() email_enabled: boolean;
  @Field() sms_enabled: boolean;
  @Field() app_enabled: boolean;
}
