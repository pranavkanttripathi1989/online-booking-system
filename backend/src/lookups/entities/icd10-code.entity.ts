import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType('Icd10Code')
export class Icd10CodeType {
  @Field(() => ID) id: string;
  @Field() code: string;
  @Field() description: string;
  @Field() category: string;
}
