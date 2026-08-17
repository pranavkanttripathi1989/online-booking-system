import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { ClinicType } from '../../clinics/entities/clinic.entity';

// frontend/src/graphql/queries.js ROOMS_QUERY requests `name`, but the Prisma
// column is `room_number` (schema.prisma) — exposed here as `name` via the
// service's mapping, DB column left unrenamed to avoid touching every other
// Rooms relation across schema.prisma for a cosmetic field-name difference.
@ObjectType('Room')
export class RoomType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => Int, { nullable: true })
  capacity?: number | null;

  @Field()
  is_active: boolean;

  @Field(() => ClinicType, { nullable: true })
  clinic?: ClinicType;
}
