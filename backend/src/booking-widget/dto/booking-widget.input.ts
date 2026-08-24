import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsArray, IsUrl, ArrayMinSize } from 'class-validator';

// REQ018 (US-BOOK-05) — an org admin registers which external origins may
// embed the booking widget in an iframe, and gets a short-link slug for a
// standalone share link. One shared input for create and update, matching
// DepartmentInput's established convention.
@InputType('BookingWidgetConfigInput')
export class BookingWidgetConfigInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  clinic_id?: string;

  @Field(() => [String])
  @IsArray()
  @ArrayMinSize(1)
  @IsUrl({ require_tld: false }, { each: true })
  allowed_origins: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsNotEmpty()
  short_link_slug?: string;
}
