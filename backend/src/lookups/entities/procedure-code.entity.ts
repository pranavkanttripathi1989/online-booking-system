import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType('ProcedureCode')
export class ProcedureCodeType {
  @Field(() => ID) id: string;
  @Field() code: string;
  @Field() description: string;
  @Field() category: string;
}
