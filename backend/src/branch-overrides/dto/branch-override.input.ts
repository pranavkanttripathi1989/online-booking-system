import { InputType, Field, ID, Float } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsIn, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CategoryPricingInput, ChannelPricingInput } from '../../services/dto/service.input';

export const BRANCH_OVERRIDE_MODES = ['inherit', 'override', 'skip'] as const;

// REQ055 (US-ORG-05) — one row per (product, clinic). Reuses
// CategoryPricingInput/ChannelPricingInput verbatim (REQ016) rather than
// declaring parallel input types, since the override's own category/channel
// shape is identical to the master's.
@InputType('SetProductBranchOverrideInput')
export class SetProductBranchOverrideInput {
  @Field(() => ID) @IsNotEmpty() product_id: string;
  @Field(() => ID) @IsNotEmpty() clinic_id: string;
  @Field() @IsIn(BRANCH_OVERRIDE_MODES) mode: string;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @Min(0) override_price?: number;
  @Field(() => CategoryPricingInput, { nullable: true }) @IsOptional() @ValidateNested() @Type(() => CategoryPricingInput) override_category_pricing?: CategoryPricingInput;
  @Field(() => ChannelPricingInput, { nullable: true }) @IsOptional() @ValidateNested() @Type(() => ChannelPricingInput) override_channel_pricing?: ChannelPricingInput;
}
