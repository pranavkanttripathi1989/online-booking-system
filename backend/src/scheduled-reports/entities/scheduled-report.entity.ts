import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType('ScheduledReport')
export class ScheduledReportType {
  @Field(() => ID) id: string;
  @Field(() => ID, { nullable: true }) clinic_id?: string;
  @Field() report_type: string;
  @Field(() => [String]) recipients: string[];
  @Field() cadence: string;
  @Field() channel: string;
  @Field({ nullable: true }) last_sent_at?: Date;
  @Field() is_active: boolean;
  @Field() created_at: Date;
}
