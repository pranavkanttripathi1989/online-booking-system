import { InputType, Field, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsIn, IsString, ArrayNotEmpty } from 'class-validator';

// Matches manager/Blocks.jsx's actual submitted mutation input exactly.
// updateSpacerBlock/updateRoomBlock reuse this same *Create* input type name
// on the frontend (not a separate Update*Input) — matched as-is (Rule 9).
@InputType('CreateSpacerBlockInput')
export class CreateSpacerBlockInput {
  @Field() @IsNotEmpty() clinician_id: string;
  @Field() @IsNotEmpty() clinic_id: string;
  @Field({ nullable: true }) @IsOptional() room_id?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() block_date?: string;
  @Field() @IsNotEmpty() start_time: string;
  @Field() @IsNotEmpty() end_time: string;
  @Field({ nullable: true }) @IsOptional() reason?: string;
  @Field() @IsIn(['single', 'daily', 'weekly', 'monthly', 'custom']) recurrence_type: string;
  @Field(() => [Int], { nullable: true }) @IsOptional() @ArrayNotEmpty() recurrence_days?: number[];
  @Field({ nullable: true }) @IsOptional() @IsString() end_date?: string;
}

@InputType('CreateRoomBlockInput')
export class CreateRoomBlockInput {
  @Field() @IsNotEmpty() room_id: string;
  @Field() @IsNotEmpty() clinic_id: string;
  @Field({ nullable: true }) @IsOptional() @IsString() block_date?: string;
  @Field() @IsNotEmpty() start_time: string;
  @Field() @IsNotEmpty() end_time: string;
  @Field({ nullable: true }) @IsOptional() reason?: string;
  @Field() @IsIn(['single', 'daily', 'weekly', 'monthly', 'custom']) recurrence_type: string;
  @Field(() => [Int], { nullable: true }) @IsOptional() @ArrayNotEmpty() recurrence_days?: number[];
  @Field({ nullable: true }) @IsOptional() @IsString() end_date?: string;
}
