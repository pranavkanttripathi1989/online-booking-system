import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType('BlockClinician')
export class BlockClinicianType {
  @Field(() => ID) id: string;
  @Field() first_name: string;
  @Field() last_name: string;
}

@ObjectType('BlockClinic')
export class BlockClinicType {
  @Field(() => ID) id: string;
  @Field() name: string;
}

@ObjectType('BlockRoom')
export class BlockRoomType {
  @Field(() => ID) id: string;
  @Field() room_number: string;
}

// Registered 'SpacerBlock' — matches manager/Blocks.jsx's spacerBlocks query
// exactly (mixed casing preserved as-is: clinician{} nested fields are
// snake_case, top-level isActive-style booleans elsewhere are camelCase —
// this asymmetry is the frontend's real, live contract, Rule 9).
@ObjectType('SpacerBlock')
export class SpacerBlockType {
  @Field(() => ID) id: string;
  @Field(() => ID) clinician_id: string;
  @Field(() => ID) clinic_id: string;
  @Field(() => ID, { nullable: true }) room_id?: string;
  @Field({ nullable: true }) block_date?: Date;
  @Field() start_time: string;
  @Field() end_time: string;
  @Field() reason: string;
  @Field() recurrence_type: string;
  @Field(() => [Int], { nullable: true }) recurrence_days?: number[];
  @Field({ nullable: true }) end_date?: Date;
  @Field(() => BlockClinicianType) clinician: BlockClinicianType;
  @Field(() => BlockClinicType) clinic: BlockClinicType;
  @Field(() => BlockRoomType, { nullable: true }) room?: BlockRoomType;
}

// Thinner projection for clinician/Dashboard.jsx's getSpacerBlocks(clinicianId, date).
@ObjectType('ClinicianSpacerBlock')
export class ClinicianSpacerBlockType {
  @Field(() => ID) id: string;
  @Field() startTime: string;
  @Field() endTime: string;
  @Field() duration: number;
  @Field() reason: string;
}

@ObjectType('RoomBlock')
export class RoomBlockType {
  @Field(() => ID) id: string;
  @Field(() => ID) room_id: string;
  @Field(() => ID) clinic_id: string;
  @Field() block_date: Date;
  @Field() start_time: string;
  @Field() end_time: string;
  @Field() reason: string;
  @Field() recurrence_type: string;
  @Field(() => [Int], { nullable: true }) recurrence_days?: number[];
  @Field({ nullable: true }) end_date?: Date;
  @Field(() => BlockRoomType) room: BlockRoomType;
  @Field(() => BlockClinicType) clinic: BlockClinicType;
}

@ObjectType('BlockUserError')
export class BlockUserErrorType {
  @Field() message: string;
}

@ObjectType('SpacerBlockMutationResult')
export class SpacerBlockMutationResultType {
  @Field() success: boolean;
  @Field(() => [BlockUserErrorType]) userErrors: BlockUserErrorType[];
  @Field(() => SpacerBlockType, { nullable: true }) spacerBlock?: SpacerBlockType;
}

@ObjectType('RoomBlockMutationResult')
export class RoomBlockMutationResultType {
  @Field() success: boolean;
  @Field(() => [BlockUserErrorType]) userErrors: BlockUserErrorType[];
  @Field(() => RoomBlockType, { nullable: true }) roomBlock?: RoomBlockType;
}
