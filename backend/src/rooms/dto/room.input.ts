import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

// Matches frontend/src/pages/manager/rooms/create.jsx's submitted shape
// exactly: { name, capacity, clinic_id, is_active }. room_type/clinician_type
// added additively for manager/rooms/index.jsx's live contract (its own
// CreateRoomInput/UpdateRoomInput names and {success,userErrors,room}
// wrapper were NOT preserved — that page was confirmed broken, while
// create.jsx/edit.jsx using this exact RoomInput/direct-return shape were
// already confirmed working, so the already-working contract won and
// index.jsx was rewired to match instead, context/frontend-integration-audit.md #20).
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

  @Field({ nullable: true })
  @IsOptional()
  room_type?: string;

  @Field({ nullable: true })
  @IsOptional()
  clinician_type?: string;
}
