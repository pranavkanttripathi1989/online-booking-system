import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

// Matches the "Order New Test" dialog's actual two fields exactly — patient is
// free text (no real patient picker exists yet), test_type is a fixed select.
// test_name/ordered_by/status/date_ordered are all derived server-side, not
// client-supplied — an ordering user shouldn't be able to submit a fabricated
// status or claim someone else placed the order.
@InputType('OrderTestInput')
export class OrderTestInput {
  @Field() @IsNotEmpty() patient: string;
  @Field() @IsNotEmpty() testType: string;
}
