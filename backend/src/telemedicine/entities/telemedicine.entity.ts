import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType('TelemedicineSession')
export class TelemedicineSessionType {
  @Field(() => ID) id: string;
  @Field(() => ID) encounter_id: string;
  @Field() status: string;
  @Field() valid_from: Date;
  @Field() valid_to: Date;
  @Field({ nullable: true }) recording_consent_at?: Date;
  // The room URL alone; a fresh, per-caller join token is issued
  // separately by joinTelemedicineSession — never cached/reused across
  // participants or across sessions, matching a real join link's
  // "valid for this visit only" property.
  @Field() room_url: string;
  @Field() token: string;
}

@ObjectType('ConsentToRecordingResult')
export class ConsentToRecordingResultType {
  @Field() success: boolean;
  @Field() recording_consent_at: Date;
}
