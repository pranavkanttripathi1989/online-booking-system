import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType('ClinicianType')
export class ClinicianTypeType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  is_active: boolean;
}
