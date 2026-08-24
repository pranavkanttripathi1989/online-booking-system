import { ObjectType, Field, ID } from '@nestjs/graphql';
import { ClinicType } from '../../clinics/entities/clinic.entity';

// REQ018 (US-BOOK-05). client_org_id is deliberately omitted from the
// GraphQL surface, matching every other tenant-scoped entity in this
// schema (it's a filtering/ownership column, not display data).
@ObjectType('BookingWidgetConfig')
export class BookingWidgetConfigType {
  @Field(() => ID) id: string;
  @Field(() => [String]) allowed_origins: string[];
  @Field() short_link_slug: string;
  @Field() is_active: boolean;
  @Field(() => ClinicType, { nullable: true }) clinic?: ClinicType;
}

@ObjectType('BookingWidgetUserError')
export class BookingWidgetUserErrorType {
  @Field() message: string;
}

@ObjectType('BookingWidgetMutationResult')
export class BookingWidgetMutationResultType {
  @Field() success: boolean;
  @Field(() => [BookingWidgetUserErrorType]) userErrors: BookingWidgetUserErrorType[];
  @Field(() => BookingWidgetConfigType, { nullable: true }) config?: BookingWidgetConfigType;
}
