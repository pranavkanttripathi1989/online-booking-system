import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { ClinicType } from '../../clinics/entities/clinic.entity';

// frontend/src/graphql/queries.js ROOMS_QUERY requests `name`, but the Prisma
// column is `room_number` (schema.prisma) — exposed here as `name` via the
// service's mapping, DB column left unrenamed to avoid touching every other
// Rooms relation across schema.prisma for a cosmetic field-name difference.
// `room_number`/`room_type`/`roomTypeName`/`clinician_type`/`clinicianTypeName`
// added additively for manager/rooms/index.jsx's real, live contract
// (context/frontend-integration-audit.md #20) — room_number is the same
// underlying value as `name`, just under the name that page's query uses;
// room_type/clinician_type store the RoomTypeModel/ClinicianTypeModel id the
// picker submits (a plain-text column, not an FK constraint — same "lookup
// value stored as text" pattern already used for Clinicians.clinician_type,
// see clinicians.service.ts), resolved to a display name via *Name fields.
@ObjectType('Room')
export class RoomType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  room_number?: string;

  @Field({ nullable: true })
  room_type?: string;

  @Field({ nullable: true })
  roomTypeName?: string;

  @Field({ nullable: true })
  clinician_type?: string;

  @Field({ nullable: true })
  clinicianTypeName?: string;

  @Field(() => Int, { nullable: true })
  capacity?: number | null;

  @Field()
  is_active: boolean;

  @Field(() => ClinicType, { nullable: true })
  clinic?: ClinicType;
}

@ObjectType('RoomPaginatorInfo')
export class RoomPaginatorInfoType {
  @Field(() => Int) total: number;
  @Field(() => Int) limit: number;
  @Field(() => Int) offset: number;
  @Field() hasNextPage: boolean;
  @Field() hasPreviousPage: boolean;
}

@ObjectType('RoomPaginated')
export class RoomPaginatedType {
  @Field(() => [RoomType]) data: RoomType[];
  @Field(() => RoomPaginatorInfoType) pageInfo: RoomPaginatorInfoType;
}

@ObjectType('RoomUserError')
export class RoomUserErrorType {
  @Field() message: string;
}

@ObjectType('RoomMutationResult')
export class RoomMutationResultType {
  @Field() success: boolean;
  @Field(() => [RoomUserErrorType]) userErrors: RoomUserErrorType[];
}
