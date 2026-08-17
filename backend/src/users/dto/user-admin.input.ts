import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsEmail, MinLength, IsArray } from 'class-validator';

// Matches admin/users/form.jsx's real submitted shape for create — canonical
// CREATE_USER_MUTATION(input: UserInput!) returns { id name email roles }.
@InputType('UserInput')
export class UserInput {
  @Field() @IsNotEmpty() name: string;
  @Field() @IsEmail() email: string;
  @Field() @MinLength(8) password: string;
  @Field(() => [ID]) @IsArray() role_ids: string[];
}

// UPDATE_USER_MUTATION(id, input: UserUpdateInput!) — same page, edit mode;
// password optional (blank = unchanged), plus admin/users/index.jsx's
// ToggleUser reuses this same mutation with a partial { isActive } input.
@InputType('UserUpdateInput')
export class UserUpdateInput {
  @Field({ nullable: true }) @IsOptional() name?: string;
  @Field({ nullable: true }) @IsOptional() @IsEmail() email?: string;
  @Field({ nullable: true }) @IsOptional() @MinLength(8) password?: string;
  @Field(() => [ID], { nullable: true }) @IsOptional() @IsArray() role_ids?: string[];
  @Field({ nullable: true }) @IsOptional() isActive?: boolean;
}

// admin/Roles.jsx's MockStore.createRole/updateRole shape exactly.
@InputType('AppRoleInput')
export class AppRoleInput {
  @Field() @IsNotEmpty() name: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
  @Field({ nullable: true }) @IsOptional() is_active?: boolean;
  @Field(() => [ID], { nullable: true }) @IsOptional() @IsArray() permission_ids?: string[];
}
