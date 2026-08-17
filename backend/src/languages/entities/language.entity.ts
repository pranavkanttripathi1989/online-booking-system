import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType('Language')
export class LanguageType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field() code: string;
  @Field() is_active: boolean;
  @Field() is_default: boolean;
}
