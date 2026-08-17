import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

// Matches frontend/src/pages/manager/rooms/create.jsx's submitted shape exactly:
// { name, capacity, clinic_id, is_active } — no room_type/clinician_type sent yet.
@InputType()
export class RoomInput {
  @Field()
  @IsNotEmpty()
  name: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  clinic_id?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
