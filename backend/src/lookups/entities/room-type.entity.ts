import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType('RoomType')
export class RoomTypeType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  is_active: boolean;
}
